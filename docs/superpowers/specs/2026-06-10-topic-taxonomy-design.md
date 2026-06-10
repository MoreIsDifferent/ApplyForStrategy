# Topic Taxonomy & Filter Logic — Design

## Overview

The `topics` table currently holds 269 unique raw strings extracted by the LLM from
faculty bios (e.g. "Behavior Change", "Behavioral Change", "AI and organizations",
"Artificial Intelligence in the Workplace"). This makes the Topic facet an
unscrollable wall of checkboxes and the per-school portfolio chart an unreadable
269-slice pie. This spec adds a lightweight taxonomy layer that:

- Normalizes near-duplicate topic strings to a single canonical display name.
- Assigns every topic to one of a fixed set of broad categories.
- Powers a two-level Topic facet (collapsed categories, expand to see specific
  topics, both levels checkable).
- Powers a per-school portfolio chart grouped by category (≈10 slices instead of
  hundreds).
- Fixes facet/filter logic to use AND ("intersection") semantics across all
  selections within a field.

**Out of scope** (separate specs): visual redesign, scraping "Research Interests"
sections from bios, taxonomy/hierarchy for Theories (only 17 unique values, a flat
list is fine).

## Data Model

Rather than a separate join table, extend the existing `topics` table directly
(one row per raw topic, so no new join needed):

```sql
alter table topics
  add column canonical_name text,
  add column category text,
  add column needs_categorization boolean not null default true;
```

- `canonical_name`: display name after merging near-duplicates (e.g. both
  "Behavior Change" and "Behavioral Change" rows get `canonical_name =
  'Behavioral Change'`). Defaults to the raw `name` when no merge is needed.
- `category`: one of the fixed category vocabulary below, or `null` until
  categorized.
- `needs_categorization`: `true` for any topic not yet processed by the
  categorization script. Mirrors the existing `faculty.needs_review` pattern.

### `scraper/scraper/upsert.py` change

`get_or_create_tag_id` currently does `insert({"name": name})` for new topics. For
the `topics` table specifically, the insert should leave `canonical_name` and
`category` as `null` and `needs_categorization` defaulting to `true` (no code
change needed beyond not setting those columns — the DB defaults handle it). This
means topics discovered in future quarterly scrapes automatically show up as
"needs categorization" until the categorization script is re-run.

## Category Vocabulary

A fixed list of 10 broad categories plus an "Other" catch-all for anything that
doesn't fit:

1. Corporate Strategy & Governance
2. Innovation & Technology
3. Entrepreneurship & New Ventures
4. Strategic Leadership & Management
5. Organizational Behavior & Design
6. People, Talent & DEI
7. Decision Making & Behavioral Science
8. Markets, Competition & Industry
9. Social Impact & Sustainability
10. Global Strategy & Emerging Markets
11. Other

This list lives as a constant in the categorization script (and is documented here
so the web UI can rely on a known, bounded set of category names for ordering).
Topics with `category is null` (not yet categorized — e.g. brand-new topics from a
future scrape before the script re-runs) are grouped into "Other" by the web app at
query time, regardless of `needs_categorization`.

## Categorization Script

New script `scraper/scraper/categorize_topics.py`:

1. Connects to Supabase with the service-role key (same pattern as `upsert.py`).
2. Fetches all rows from `topics` where `needs_categorization = true`.
3. Sends the list of raw topic names to the LLM in one or a few batched calls
   (reusing `build_client()` / `get_model()` from `extract.py`), with a prompt
   that:
   - Provides the fixed 11-category vocabulary above.
   - Asks the LLM to group near-duplicate/synonymous topics together under one
     `canonical_name` (title-case, singular preferred form) and assign each to
     exactly one category.
   - Returns JSON: `[{"name": "<raw topic name>", "canonical_name": "...",
     "category": "..."}, ...]`.
4. For each result, updates the corresponding `topics` row: sets
   `canonical_name`, `category`, `needs_categorization = false`.
5. Run manually once now (against the current 269 topics) and again after future
   scrapes pick up new topics. The user reviews the resulting `canonical_name`/
   `category` assignments via Supabase before considering them final — if any look
   wrong, they can be hand-edited directly in Supabase (no app code depends on how
   the values were produced).

## Web Data Layer

### `web/lib/types.ts`

```ts
export interface Topic {
  name: string;     // canonical_name (falls back to raw name if uncategorized)
  category: string; // category, or "Other" if null
}

export interface Faculty {
  ...
  topics: Topic[];   // deduped by canonical name
  theories: string[]; // unchanged
}
```

### `web/lib/data.ts`

Update the `faculty_topics` nested select to also pull `canonical_name` and
`category`:

```ts
'*, schools(*), faculty_topics(topics(name, canonical_name, category)), faculty_theories(theories(name))'
```

In `toFaculty`, map each linked topic row to
`{ name: canonical_name ?? name, category: category ?? 'Other' }`, then dedupe the
resulting list by `name` (two raw topics that map to the same canonical name
collapse into one entry).

## Filtering Logic (`web/lib/filtering.ts`)

**AND/intersection everywhere:** `matchesField` changes from `selected.some(...)`
to `selected.every(...)` — a faculty must match *every* selected value for a field,
not just one. This applies uniformly to `topics`, `theories`, `methodology`, and
`geography`. For single-valued fields (`methodology`, `geography`), selecting two
different values will yield zero results — this is expected and acceptable per
product decision (methodology may become multi-valued in the future, at which point
AND becomes meaningful there too).

**Topics field value space includes categories:** `valuesForField(faculty,
'topics')` returns the deduped union of each topic's `name` **and** `category` for
that faculty. This lets a single filter-selection set mix category-level and
specific-topic-level values and have AND work correctly:

```ts
case 'topics': {
  const values = new Set<string>();
  for (const t of faculty.topics) {
    values.add(t.name);
    values.add(t.category);
  }
  return Array.from(values);
}
```

Selecting "Innovation & Technology" (category) AND "Corporate Governance" (specific
topic, different category) shows faculty who have at least one topic in
"Innovation & Technology" *and* also have the "Corporate Governance" topic.

## Topic Facet UI

A new `TopicFacet` component (replacing the generic `FacetColumn` for the `topics`
field only; `FacetColumn` continues to be used as-is for Theory/Methodology/
Geography):

- Groups all faculty topics by `category`, computing a count per category (faculty
  count with ≥1 topic in that category, given other active filters) and per
  specific topic (same `getFacetCounts`-style logic, scoped within the category).
- Renders categories as collapsible sections (collapsed by default), each with a
  checkbox (selects/deselects the category-level filter value) and an
  expand/collapse toggle.
- Expanding a category reveals its specific topics as checkboxes (indented),
  sorted by count descending then alphabetically.
- The whole facet list (all categories) sits in a fixed-height scrollable
  container.
- Categories with zero matching faculty under current filters are hidden (existing
  `getFacetCounts`-derived behavior, preserved).

Functional structure only in this spec — final visual styling (colors, spacing,
fonts) is handled by the visual redesign spec, which will restyle this component
along with everything else.

## Portfolio Chart (`web/lib/portfolio.ts`, `PortfolioChart.tsx`)

`getTopicDistribution` groups by `topic.category` instead of raw topic name,
producing ≈10 slices (one per category present at that school) instead of
hundreds. Function signature/output shape (`{ topic, count, percentage }[]`)
stays the same — `topic` now holds the category name. (Per-school faculty counts
are small (≤48), so a category can have a count as low as 1 — that's fine, small
slices are expected and readable at this granularity.)

## Testing

- `lib/filtering.test.ts`: update for AND semantics (`every`), and the new
  `topics` value-space (name ∪ category) including category+topic combination
  cases.
- `lib/portfolio.test.ts`: update fixtures to use `Topic[]` (`{name, category}`)
  and assert grouping by category.
- New `components/TopicFacet.test.tsx`: category collapse/expand, category-level
  and topic-level checkbox selection, count display.
- Existing `FacetBar`/`FacetColumn`/`FilterableFacultyList`/`FacultyCard` tests
  updated for the `Topic[]` shape (`sampleData.ts` topics become `{name,
  category}` objects).

## Rollout

1. Run the `alter table topics ...` migration in Supabase SQL editor.
2. Run `categorize_topics.py` once against the current 269 topics; spot-check
   results in Supabase, hand-edit any obviously wrong `canonical_name`/`category`
   values.
3. Ship the web app changes (data layer, filtering, `TopicFacet`, portfolio chart).
4. Future quarterly scrapes: `upsert.py` needs no change (new topics default to
   `needs_categorization = true`); re-run `categorize_topics.py` afterward to
   categorize any newly-discovered topics.
