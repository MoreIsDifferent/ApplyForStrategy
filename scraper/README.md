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
