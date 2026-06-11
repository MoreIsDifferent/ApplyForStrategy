# Publication Enrichment (OpenAlex) Design

## Goal

Populate the currently-empty `publications` table with each faculty member's most
relevant papers, sourced from OpenAlex (not Google Scholar directly, due to
anti-bot/ToS issues with scraping Scholar). This is the foundational data layer
for two follow-on sub-projects (not part of this spec):

- Optimizing topic/theory classification using bios + publication abstracts
- Building a real coauthor network from `publications.coauthors`

This spec is school-agnostic: it operates on `faculty` rows that already exist
in the database (currently ~15 faculty across Wharton, Chicago Booth, and UCLA
Anderson), independent of the per-school directory scraping pipeline. It does
not address scaling the directory scraper to the UTD Top 100 (a separate,
later spec).

## Why OpenAlex

Google Scholar has no official API and aggressive anti-bot/CAPTCHA measures;
scraping it violates its ToS and would be fragile at scale. OpenAlex is a free,
open API (no key required, just an email for the "polite pool" of higher rate
limits) that provides:

- `cited_by_count` and `publication_date` per work, enabling "most recent" and
  "most cited" rankings
- Reconstructable abstracts via `abstract_inverted_index`
- Author records with institution affiliation history, useful for
  disambiguation

Semantic Scholar and Crossref were considered as alternatives/fallbacks but are
not used in this spec (Semantic Scholar has stricter rate limits and weaker
institution-affiliation data; Crossref's citation counts are less complete).
They remain options for a future fallback if OpenAlex match rates prove too
low in practice.

## Author Matching

OpenAlex does **not** expose a Google Scholar ID in its `ids` field (confirmed
via the live API — only `openalex`, `orcid`, and occasionally `mag`/`scopus`/
`wikipedia` appear). So matching cannot use `faculty.google_scholar_url` as a
literal cross-check. Instead:

1. Resolve the faculty member's school to an OpenAlex institution ID (cached on
   `schools.openalex_institution_id`, looked up once per school via
   `/institutions?filter=display_name.search:{school_name}` and stored).
2. Search `/authors?filter=display_name.search:{faculty_name}`.
3. Filter candidates whose `affiliations` include the school's OpenAlex
   institution ID.
4. If exactly one candidate matches → confidence `name_institution`, cache
   `faculty.openalex_author_id`.
5. If zero or multiple candidates match → confidence `ambiguous`, set
   `faculty.needs_review = true`, do not fetch publications for this faculty
   member (until a human resolves the match, e.g. by manually setting
   `openalex_author_id` via the Supabase dashboard).

`faculty.google_scholar_url` remains in the table for human reviewers doing
manual disambiguation, but does not drive automated matching.

## Recent / Most-Cited Selection & "Prolific" Expansion

For each matched author, fetch:

- Top N most recent works (sorted by `publication_date:desc`)
- Top N most-cited works (sorted by `cited_by_count:desc`)

Where `N = 10` by default, expanded to `N = 20` if either:

- `works_count > 30` (lifetime publication count, per OpenAlex author record), OR
- the author has published 3 or more works in the last 3 years (covers
  highly-active "rising star" junior faculty who may not yet have 30 lifetime
  works)

The two lists are deduplicated by `openalex_id` (a paper appearing in both
lists is stored once).

## Database Changes (migration `0003_publication_enrichment.sql`)

```sql
-- publications: support OpenAlex-sourced data and dedup
alter table publications add column abstract text;
alter table publications add column openalex_id text;
alter table publications add constraint publications_faculty_openalex_unique
  unique (faculty_id, openalex_id);

-- faculty: cache OpenAlex author match
alter table faculty add column openalex_author_id text;
alter table faculty add column openalex_match_confidence text
  check (openalex_match_confidence in ('name_institution', 'ambiguous'));

-- schools: cache OpenAlex institution ID
alter table schools add column openalex_institution_id text;
```

## New Module: `scraper/scraper/openalex.py`

Pure functions wrapping the OpenAlex HTTP API (via `requests`, already a
dependency). All requests include `mailto={email}` for the polite pool (email
configurable via `OPENALEX_EMAIL` env var).

- `resolve_institution_id(school_name: str) -> str | None`
- `find_author(name: str, institution_id: str | None) -> tuple[str | None, str]`
  — returns `(openalex_author_id_or_None, confidence)`
- `fetch_works(author_id: str, expand: bool) -> list[dict]` — returns
  deduplicated work dicts with keys: `openalex_id`, `title`, `year`, `journal`,
  `citation_count`, `coauthors`, `abstract`
- `is_prolific(author_record: dict) -> bool` — implements the
  works_count/recent-activity rule above

## New Script: `scraper/scraper/enrich_publications.py`

Follows the existing `categorize_topics.py` pattern: a `main()` that builds a
Supabase client directly from `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, with
a CLI entrypoint.

```
python -m scraper.enrich_publications [--school SLUG] [--limit N]
```

For each `faculty` row (optionally filtered by school slug, optionally
limited):

1. Skip if `openalex_author_id` is already set (re-run only refreshes
   publications for already-matched faculty; re-matching is a manual/explicit
   operation, not automatic, to avoid flapping a confirmed match).
2. Resolve the faculty's school's `openalex_institution_id` (cache on
   `schools` table if not yet set).
3. Call `find_author`. If `ambiguous`, set `faculty.needs_review = true` and
   `faculty.openalex_match_confidence = 'ambiguous'`; skip publication fetch.
4. If matched, set `openalex_author_id` and
   `openalex_match_confidence = 'name_institution'`.
5. Call `fetch_works` (recent + most-cited, deduped, with prolific expansion).
6. Upsert each work into `publications` keyed on `(faculty_id, openalex_id)`.

## Manual Review Workflow (reuses existing pattern)

Faculty flagged `needs_review = true` with
`openalex_match_confidence = 'ambiguous'` surface in the Supabase dashboard
Table Editor (filter `faculty` where `needs_review = true`). A human can:

- Look up the correct OpenAlex author manually (e.g., via openalex.org search,
  cross-referencing `google_scholar_url`)
- Set `faculty.openalex_author_id` directly in the dashboard
- Re-run `enrich_publications.py --school <slug>` — since `openalex_author_id`
  is now set, the script will skip re-matching and proceed straight to
  fetching publications for that faculty member

## Testing

Following existing conventions (`tests/fake_supabase.py`, mocked HTTP via
`MagicMock`, fixture-based):

- `tests/test_openalex.py` — unit tests for `resolve_institution_id`,
  `find_author` (single match, zero matches, multiple matches → ambiguous),
  `fetch_works` (dedup, abstract reconstruction, prolific expansion rule)
- `tests/test_enrich_publications.py` — integration-style test using
  `fake_supabase.py`, covering: skip-if-already-matched, ambiguous →
  needs_review, successful match → publications upserted

## Out of Scope

- Scaling the per-school directory scraper to the UTD Top 100 (separate spec)
- Using publication abstracts for topic/theory classification (separate
  sub-project, depends on this data existing)
- Building the coauthor network from `publications.coauthors` (separate
  sub-project, depends on this data existing)
- Semantic Scholar/Crossref fallback for faculty OpenAlex can't match (noted as
  a possible future enhancement if match rates are too low)
