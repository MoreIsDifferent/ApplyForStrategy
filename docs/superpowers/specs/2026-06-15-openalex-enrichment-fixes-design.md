# OpenAlex Enrichment Fixes Design

## Background

[[2026-06-11-publication-enrichment-design.md]] shipped `scraper/scraper/enrich_publications.py`
and `scraper/scraper/openalex.py`. After the scale-out to ~100 schools / 1859
faculty, running the full enrichment surfaced two bugs:

1. **Pagination cap.** `enrich_publications.run()` does
   `supabase.table("faculty").select(...).execute()` with no pagination.
   Supabase/PostgREST caps unbounded selects at 1000 rows, so only the first
   1000 of 1859 faculty are ever considered — 859 are silently skipped. (Same
   bug class as the one just fixed in `web/lib/data.ts`'s `getAllFaculty()`.)

2. **Institution resolution fails for ~95% of schools.**
   `resolve_institution_id(school_name)` calls
   `/institutions?filter=display_name.search:{school_name}`, a phrase-style
   search against OpenAlex's `display_name`. School names in our `schools`
   table are typically `"<University> <School Name>"` (e.g. "Harvard Business
   School", "UC Berkeley Haas", "Chicago Booth"). OpenAlex's institution
   records are almost always the parent university ("Harvard University",
   "University of California, Berkeley", "University of Chicago"), which
   shares no words with the business-school-specific name, so the phrase
   search returns zero results. Only 5/100 schools currently have
   `schools.openalex_institution_id` set — the 5 that happen to be standalone
   OpenAlex institutions (Wharton, Chicago Booth, UCLA Anderson, HEC Paris,
   London Business School).

   When `institution_id` is `None`, `find_author` immediately returns
   `(None, "ambiguous")` for every faculty member at that school. As a result,
   of the 1089 faculty processed so far, 1005 are marked
   `openalex_match_confidence = 'ambiguous'` / `needs_review = true` — almost
   none of these are genuinely ambiguous; they never got a real search.

## Goal

Fix both bugs, backfill correct `schools.openalex_institution_id` for all 100
schools, give the 1005 incorrectly-flagged faculty a fair re-match, and re-run
enrichment across the full faculty set.

## Part 1: Institution ID resolution (one-time, human-reviewed)

### Resolution heuristic

New script `scraper/scraper/resolve_institutions.py`. For each school in
`schools` where `openalex_institution_id` is null, try in order, stopping at
the first strategy that returns at least one OpenAlex institution result:

1. **Full name, phrase search**: `/institutions?filter=display_name.search:{school_name}`
   (the existing `resolve_institution_id` behavior). Catches standalone
   business schools (Wharton, LBS, INSEAD, HEC Paris, ESADE, etc.).

2. **Progressive suffix stripping + relevance search**: repeatedly drop the
   last word of `school_name` (e.g. "Harvard Business School" →
   "Harvard Business" → "Harvard"), and for each candidate call
   `/institutions?search={candidate}` (OpenAlex's relevance-ranked free-text
   search, not the phrase `display_name.search` filter). Stop stripping as
   soon as a candidate yields results. This resolves the common case where
   the school name is "<core university name> <business school name>".

For each school, record the **top result** from whichever strategy first
produced results: `openalex_institution_id`, `display_name`, `works_count`,
`homepage_url`, and which strategy/query matched. Write this as a CSV report
to `output/institution_resolution_report.csv` (not committed — same
`output/` directory used for scraper JSON, already gitignored).

### Human review

Walk through `output/institution_resolution_report.csv` together. For each
row, sanity-check the proposed institution against the school's real-world
parent university (e.g. does `display_name` and `homepage_url` make sense,
and is `works_count` plausibly large for a research university). Corrections
are made directly in the CSV (edit the `openalex_institution_id` /
`display_name` columns, or blank them out to mean "no match — leave null").

### Applying the mapping

A second small script (or a `--apply` flag on the same script) reads the
reviewed CSV and writes `schools.openalex_institution_id` for every row with a
non-blank ID. Schools left blank in review keep `openalex_institution_id =
null` (handled the same as today: `enrich_faculty` will call
`resolve_institution_id` at runtime as a fallback, which will likely still
return nothing for these, leaving those faculty `ambiguous` — acceptable,
since these are presumably genuine edge cases the heuristic couldn't resolve
either).

## Part 2: Fix pagination in `enrich_publications.run()`

`scraper/scraper/enrich_publications.py:74-86` currently does:

```python
def run(supabase, school_slug: str | None = None, limit: int | None = None) -> None:
    query = supabase.table("faculty").select("id, name, school_id, openalex_author_id")
    if school_slug:
        school = supabase.table("schools").select("id").eq("slug", school_slug).execute().data[0]
        query = query.eq("school_id", school["id"])

    rows = query.execute().data
    if limit is not None:
        rows = rows[:limit]
    ...
```

Change to paginate with `.range()` in pages of 1000, following the same
pattern as `web/lib/data.ts`'s `getAllFaculty()`:

```python
PAGE_SIZE = 1000

def run(supabase, school_slug: str | None = None, limit: int | None = None) -> None:
    query = supabase.table("faculty").select("id, name, school_id, openalex_author_id")
    if school_slug:
        school = supabase.table("schools").select("id").eq("slug", school_slug).execute().data[0]
        query = query.eq("school_id", school["id"])

    rows = []
    for offset in itertools.count(0, PAGE_SIZE):
        page = query.range(offset, offset + PAGE_SIZE - 1).execute().data
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break

    if limit is not None:
        rows = rows[:limit]
    ...
```

(`--limit` continues to mean "process at most N faculty total", applied after
fetching all rows, matching current behavior for small test runs.)

## Part 3: Reset incorrectly-flagged "ambiguous" faculty

One-time data fix (run once, via a short inline script or extending
`resolve_institutions.py` with a `--reset-ambiguous` step): for every `faculty`
row where `openalex_match_confidence = 'ambiguous'` AND `openalex_author_id IS
NULL`, set `openalex_match_confidence = NULL` and `needs_review = false`.

This must run **after** Part 1 (institution IDs populated) so the subsequent
full re-run in Part 4 gives these faculty a real match attempt against the
correct institution. Faculty that are genuinely ambiguous (real name
collisions, etc.) will simply be re-flagged `ambiguous` again — no harm.

Faculty with `needs_review = true` for *other* reasons (e.g. newly-scraped
faculty awaiting initial bio review, set by `upsert.py`) are unaffected — the
filter is scoped to `openalex_match_confidence = 'ambiguous'` specifically.

## Part 4: Re-run enrichment

`python -m scraper.enrich_publications` (no filters), in the background, same
as the current full-backlog run but now covering all 1859 faculty with correct
institution IDs. Expect a meaningfully higher match rate than the current 84
(out of 1089 attempted).

## Testing

- `tests/test_enrich_publications.py`: add a test for the pagination fix —
  `fake_supabase` returns >1000 faculty rows across two `.range()` calls,
  assert `run()` processes all of them.
- `tests/test_resolve_institutions.py`: unit tests for the suffix-stripping
  heuristic (e.g. "Harvard Business School" → tries "Harvard Business" then
  "Harvard"; "Chicago Booth" → tries "Chicago") and for the CSV
  report/apply round-trip, with `openalex._get` mocked.

## Out of Scope

- Improving `find_author`'s matching logic itself (e.g. handling multiple
  candidates more intelligently, fuzzy name matching) — today's "exactly one
  candidate or ambiguous" rule is unchanged. Genuinely ambiguous faculty after
  this fix remain `needs_review = true` for manual resolution, per the
  existing workflow in
  [[2026-06-11-publication-enrichment-design.md]].
- Re-resolving the 84 faculty already matched `name_institution` (left as-is).
- The 3 still-unresolved scraper schools (penn-state-smeal,
  wisconsin-school-of-business, peking-guanghua) from the pipeline-failure fix
  — unrelated to this spec.
