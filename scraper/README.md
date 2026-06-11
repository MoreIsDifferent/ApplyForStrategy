# Strategy PhD Faculty Finder — Scraping Pipeline

Scrapes Strategy-area faculty bios from school websites, extracts structured
fields (PhD institution, methodology, research topics, theories) via an LLM, and
writes per-school JSON to `output/`. An upsert script loads that JSON into
Supabase, flagging new/changed faculty records with `needs_review`.

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/playwright install chromium
cp .env.example .env  # fill in LLM_BASE_URL, LLM_API_KEY, LLM_MODEL
```

## Running the pipeline

```bash
source .env && python -m scraper.pipeline
```

Set `SCRAPE_LIMIT=N` to cap the number of faculty scraped per school (useful for
testing / controlling LLM API cost).

Output is written to `output/<school-slug>.json`.

## Upserting into Supabase

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`, and the schema
in `../supabase/schema.sql` plus migrations in `../supabase/migrations/` applied.

```bash
source .env && python -m scraper.upsert
```

New faculty are inserted with `needs_review=true`. Existing faculty whose bio
content has changed (detected via `bio_hash`) are updated and re-flagged for
review. Topics/theories are free-form — new tags proposed by the LLM are added to
the `topics`/`theories` lookup tables and should be reviewed/merged via the admin
interface.

## Enriching publications from OpenAlex

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Optionally set
`OPENALEX_EMAIL` to your email address to use OpenAlex's "polite pool" for
higher rate limits (defaults to a placeholder address otherwise).

```bash
source .env && python -m scraper.enrich_publications
```

For each faculty member without a cached `openalex_author_id`, this:

1. Resolves the faculty member's school to an OpenAlex institution ID (cached
   on `schools.openalex_institution_id` after the first lookup)
2. Searches OpenAlex for an author matching the faculty member's name at that
   institution. If exactly one match is found, caches
   `faculty.openalex_author_id` and `openalex_match_confidence =
   'name_institution'`. If zero or multiple candidates match, sets
   `openalex_match_confidence = 'ambiguous'` and `needs_review = true` and
   skips publication fetching for that person.
3. For matched faculty, fetches their most recent and most-cited works (10
   each, expanded to 20 if `works_count > 30` or they have 3+ works in the
   last 3 years), deduplicates by `openalex_id`, and upserts into
   `publications`.

Use `--school <slug>` to limit to one school, and `--limit N` to cap the
number of faculty processed (useful for testing).

### Manually resolving ambiguous matches

Faculty flagged `needs_review = true` with `openalex_match_confidence =
'ambiguous'` can be resolved manually via the Supabase dashboard Table Editor:
look up the correct author at openalex.org (cross-referencing
`google_scholar_url` if present), and set `faculty.openalex_author_id`
directly. Re-running `enrich_publications` will then skip re-matching (since
`openalex_author_id` is set) and fetch publications for that person.

## Testing

```bash
.venv/bin/pytest -v
```

Per-school scraper tests run against saved HTML fixtures in `tests/fixtures/` so
they don't depend on live sites.

## Adding a new school

1. Add an entry to `config/schools.yaml` (slug, name, directory_url, fetch_mode)
2. Create `scraper/schools/<slug>.py` implementing `parse_faculty_list`,
   `parse_bio`, `scrape_faculty_list`, `scrape_bio` (see `wharton.py` for the
   pattern)
3. Register the module in `SCRAPER_MODULES` in `scraper/pipeline.py`
4. Add fixture-based tests in `tests/test_schools_<slug>.py`
