# Strategy PhD Faculty Finder — Scraping Pipeline Design Spec (Plan B Pilot)

## Overview

Plan B builds the data pipeline that populates the Strategy PhD Faculty Finder with real
faculty data, replacing the fictional sample dataset built in Plan A. This pilot scopes
the pipeline to the 3 schools already present in the sample data — Wharton (UPenn),
Chicago Booth, and UCLA Anderson — to prove out the architecture end-to-end. Additional
schools can be added later by writing new per-school scraper modules + config entries,
without changing the core pipeline.

## Scope

**In scope (this pilot):**
- Faculty bio scraping for Wharton, Chicago Booth, UCLA Anderson (Strategy-area faculty)
- LLM-based extraction of `phd_institution`, `methodology`, `topics`, `theories`,
  `personal_website_url`, `google_scholar_url` from bio text
- Structured JSON output per school
- Supabase upsert script with `needs_review` flagging (code written and unit-tested,
  but no live run since Supabase isn't set up yet)
- GitHub Actions workflow for quarterly scheduled runs (written, not triggered live)

**Out of scope (deferred):**
- Google Scholar publication scraping (`publications` table stays empty) — Google
  Scholar's anti-scraping measures make this unreliable without a paid scraping API;
  revisit in a future iteration if needed
- Schools beyond the initial 3
- Rankings/placement data scraping (per main spec, this is semi-annual and largely manual)
- Live Supabase upsert run (no project exists yet) — the upsert script and its tests
  are the deliverable; running it against a real database happens once Supabase is set up

## Architecture

New top-level `scraper/` directory (sibling to `web/` and `supabase/`):

```
scraper/
  pyproject.toml / requirements.txt
  .env.example
  config/
    schools.yaml              # per-school scraper config
  scraper/
    __init__.py
    fetch.py                  # shared fetchers: static (requests+BS4) and rendered (Playwright)
    schools/
      __init__.py
      wharton.py
      chicago_booth.py
      ucla_anderson.py
    extract.py                # LLM extraction client (OpenAI-compatible)
    pipeline.py                # orchestrates scrape -> extract -> write JSON
    upsert.py                  # reads output JSON -> upserts into Supabase
  output/
    wharton.json
    chicago-booth.json
    ucla-anderson.json
  tests/
    fixtures/                  # saved HTML snippets per school for offline tests
    test_schools_*.py
    test_extract.py
    test_upsert.py
    test_pipeline.py

.github/workflows/scrape.yml   # scheduled quarterly run (repo root)
supabase/migrations/0001_add_bio_hash.sql
```

**Tech stack:** Python 3.11+, `requests` + `beautifulsoup4` for static pages,
`playwright` for JS-rendered pages, an OpenAI-compatible client (`openai` Python SDK
pointed at a custom `base_url`) for LLM extraction, `supabase-py` for the upsert step,
`pytest` for testing.

## Pipeline Flow

For each school listed in `config/schools.yaml`:

1. **SCRAPE** — `scraper/schools/<slug>.py` fetches the faculty directory page and
   returns a list of `FacultyStub { name, title, profile_url }` for Strategy-area
   faculty. For each stub, fetch the individual profile page (if bio is on a separate
   page) and extract `bio_text`.

2. **EXTRACT** — `extract.py` sends `name`, `title`, and `bio_text` to the LLM with a
   structured-output prompt (JSON mode), requesting:
   - `phd_institution: string | null`
   - `methodology: "Quantitative" | "Qualitative" | "Mixed" | "Experimental" | "Computational" | null`
   - `topics: string[]` — LLM's best judgment, free-form (not constrained to existing list)
   - `theories: string[]` — same
   - `personal_website_url: string | null`
   - `google_scholar_url: string | null`

   If `bio_text` is empty or below a minimum length threshold, skip the LLM call
   entirely and return all-null extracted fields (avoids wasting API calls).

3. **ASSEMBLE** — Merge scraped fields + extracted fields into a faculty record
   matching the `faculty` table shape, plus a `bio_hash` (SHA-256 of `bio_text`) for
   change detection.

4. **WRITE** — Write `scraper/output/<school-slug>.json`, an array of faculty records
   for that school.

### Output JSON shape

```json
[
  {
    "name": "Jane Doe",
    "title": "Assistant Professor",
    "school_profile_url": "https://www.wharton.upenn.edu/faculty/jane-doe",
    "personal_website_url": null,
    "google_scholar_url": null,
    "phd_institution": "MIT",
    "methodology": "Quantitative",
    "topics": ["Innovation", "Corporate Strategy"],
    "theories": ["RBV"],
    "bio_hash": "sha256:..."
  }
]
```

Publications scraping is deferred; the `publications` table remains unused for now but
the schema already supports it.

## Scraper Architecture (per-school)

`scraper/fetch.py` provides two fetchers behind a common interface:

- `fetch_static(url) -> BeautifulSoup` — `requests` + BS4, with a polite delay and a
  descriptive User-Agent string
- `fetch_rendered(url) -> BeautifulSoup` — Playwright headless Chromium, for JS-driven
  directory pages

`config/schools.yaml` declares per-school metadata:

```yaml
- slug: wharton
  name: "Wharton (UPenn)"
  directory_url: "https://www.wharton.upenn.edu/faculty-research/faculty-directory/?department=mgmt"
  fetch_mode: static
- slug: chicago-booth
  name: "Chicago Booth"
  directory_url: "https://www.chicagobooth.edu/faculty/directory?area=Strategy and Leadership"
  fetch_mode: rendered
- slug: ucla-anderson
  name: "UCLA Anderson"
  directory_url: "TBD - determined during implementation"
  fetch_mode: rendered
```

Each `scraper/schools/<slug>.py` implements a common interface:

```python
def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    """Returns name, title, profile_url for each Strategy-area faculty member."""

def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    """Fetches the faculty member's profile page and returns bio text."""
```

`pipeline.py` is generic: it loops over schools, calls each module's two functions,
then runs extraction and writes output. **Per-school selector details (CSS selectors,
exact filtering for Strategy-area faculty, and the UCLA Anderson directory URL) are
determined during implementation** by an implementer doing live page inspection —
these can't be reliably pinned down during design since at least one of these sites
(Chicago Booth) appears to be JS-driven and may change.

## LLM Extraction

`scraper/extract.py`:

```python
client = OpenAI(base_url=os.environ["LLM_BASE_URL"], api_key=os.environ["LLM_API_KEY"])
model = os.environ.get("LLM_MODEL", "mimo-v2.5-pro")

def extract_faculty_fields(name: str, title: str, bio_text: str) -> ExtractedFields:
    """Sends bio text to the LLM, requests JSON output matching ExtractedFields schema."""
```

- Uses JSON-mode / structured output (`response_format={"type": "json_object"}`) with
  a prompt instructing the model to extract the fields above, returning `null` for
  anything it can't determine, and to use judgment to identify 1-4 of the most
  prominent research topics and theoretical frameworks from the bio text.
- Retries with exponential backoff on API errors (3 attempts).
- Skips the LLM call (returns all-null fields) when `bio_text` is empty or too short
  to be useful.

### `.env.example`

```
LLM_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
LLM_API_KEY=
LLM_MODEL=mimo-v2.5-pro
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Upsert & `needs_review` Logic

`scraper/upsert.py` reads each `output/<school_slug>.json` and upserts into Supabase:

```python
def upsert_school_data(school_slug: str, records: list[dict], supabase: Client):
    """
    For each faculty record:
      - Look up existing faculty row by (school_id, name)
      - If not found: insert with needs_review=true
      - If found: compare bio_hash to stored hash
          - changed -> update fields, set needs_review=true
          - unchanged -> leave row as-is
      - For topics/theories: upsert into lookup tables (case-insensitive
        match on name; insert if not present), then replace this
        faculty's faculty_topics/faculty_theories junction rows
    """
```

- A `bio_hash text` column is added to `faculty` via
  `supabase/migrations/0001_add_bio_hash.sql` (the original schema didn't include it).
- Since no Supabase project exists yet, this script cannot run live during this pilot.
  It is implemented and unit-tested against a mocked `supabase-py` client, verifying
  the insert/update/`needs_review` branching and tag-upsert logic.
- Topics/theories tables stay open-ended (LLM proposes tags freely) — reviewing and
  merging new tags is an admin task (Plan C), already covered by the main spec.

## GitHub Actions

`.github/workflows/scrape.yml` (repo root):

```yaml
name: Quarterly Faculty Scrape
on:
  schedule:
    - cron: "0 6 1 1,4,7,10 *"   # 1st of Jan/Apr/Jul/Oct
  workflow_dispatch: {}

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.11" }
      - run: pip install -r scraper/requirements.txt && playwright install chromium
        working-directory: scraper
      - run: python -m scraper.pipeline
        working-directory: scraper
        env:
          LLM_BASE_URL: ${{ secrets.LLM_BASE_URL }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_MODEL: ${{ secrets.LLM_MODEL }}
      - run: python -m scraper.upsert
        working-directory: scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
      - uses: actions/upload-artifact@v4
        with: { name: scrape-output, path: scraper/output/ }
```

This workflow is written and ready to use once Supabase secrets are added to the
`MoreIsDifferent/ApplyForStrategy` repo, but is not triggered live during this pilot.

## Testing Approach

- **`scraper/schools/*.py`**: tests run against saved HTML fixtures (downloaded once
  during implementation, stored in `tests/fixtures/`) so tests don't depend on live
  sites and won't break when site layouts change unexpectedly between runs.
- **`extract.py`**: tests mock the LLM client, verifying prompt construction and
  response parsing (including the empty-bio skip path and retry-on-error behavior).
- **`upsert.py`**: tests use a mocked Supabase client, verifying insert / update /
  `needs_review` branching and topic/theory tag upsert logic.
- **`pipeline.py`**: an integration test wires fixtures through the full flow and
  verifies output JSON shape.
- **One live validation run** during implementation against the real sites and LLM
  endpoint, capped to a handful of faculty per school to limit LLM API cost. The HTML
  captured during this run becomes the fixtures used above.

## Open Items for Implementation

- Exact CSS selectors and Strategy-area filtering logic for each school's directory —
  determined via live page inspection during implementation
- UCLA Anderson's faculty directory URL and fetch mode — to be confirmed during
  implementation
