# Generic School Scraper — Pilot Design Spec

## Overview

The scraper currently covers 3 schools (Wharton, Chicago Booth, UCLA Anderson), each with
a hand-written parser module (`scraper/scraper/schools/*.py`) that uses BeautifulSoup
selectors tuned to that school's specific HTML structure. Scaling this pattern to the
UTD Top 100 business schools would mean writing and maintaining ~100 custom parser
modules — the main bottleneck to expanding coverage.

This spec designs a **generic, LLM-driven extraction path** that requires no per-school
parser code, and pilots it on 8-10 schools to validate the approach before committing to
the remaining ~90.

## Scope

**In scope (this pilot):**
- A generic `scraper/scraper/generic.py` module providing `scrape_faculty_list` and
  `scrape_bio`, used for any school not in `SCRAPER_MODULES`
- HTML-to-clean-text conversion via `trafilatura` (new dependency)
- A new LLM extraction call, `extract_faculty_list`, that reads a cleaned directory page
  and returns the list of faculty in the school's Strategy area
- Extending `extract_faculty_fields` usage so it operates on cleaned profile-page text
  instead of a per-school `parse_bio` selector
- `schools.yaml` schema gains an optional `area_hint` field per school
- Picking 8-10 pilot schools spanning different site platforms, adding their config
  entries, and running the pipeline to produce `output/<slug>.json` for review
- Unit tests for the new extraction call (mocked LLM) and the HTML-cleaning step
  (fixture-based)

**Out of scope (deferred to a future spec, after pilot evaluation):**
- Rewriting the 3 existing custom parsers (Wharton/Booth/UCLA keep their current modules)
- Scaling to the remaining ~90 UTD Top 100 schools
- Handling JS-paginated / "load more" / infinite-scroll directory pages — if a pilot
  school hits this, it's logged as a per-school follow-up, not solved generally here
- Live Supabase upsert of pilot results — output JSON is for manual review first
- OpenAlex publication enrichment for newly added faculty (existing
  `enrich_publications` pipeline already handles any faculty once they're upserted, no
  changes needed)

## Architecture

```
scraper/
  config/
    schools.yaml              # +area_hint field, +8-10 pilot school entries
  scraper/
    generic.py                 # NEW: school-agnostic scrape_faculty_list / scrape_bio
    extract.py                  # +extract_faculty_list() for directory-page extraction
    pipeline.py                 # dispatch: SCRAPER_MODULES[slug] if present, else generic
    schools/
      wharton.py                # unchanged
      chicago_booth.py           # unchanged
      ucla_anderson.py            # unchanged
  tests/
    fixtures/generic/            # sample HTML pages for HTML-cleaning tests
    test_generic.py               # NEW
    test_extract.py               # +tests for extract_faculty_list
  output/
    <pilot-school-slug>.json      # NEW per pilot school, for manual review
```

### `schools.yaml` schema addition

```yaml
- slug: mit-sloan
  name: "MIT Sloan"
  directory_url: "https://mitsloan.mit.edu/faculty/...strategy..."
  fetch_mode: rendered
  area_hint: "Strategy and Innovation faculty group"
```

`area_hint` is free text passed into the `extract_faculty_list` prompt, describing how
this school labels its Strategy-area faculty group. For the 3 existing schools,
`area_hint` is omitted (they keep their custom parsers and don't use this path).

### Generic extraction flow

1. **Fetch directory page** — `fetch_static` or `fetch_rendered` per `fetch_mode`
   (existing functions, unchanged).
2. **Clean to text** — `trafilatura.extract(html)` strips nav/footer/boilerplate,
   producing focused text for the LLM.
3. **`extract_faculty_list(text, area_hint, client, model)`** — new LLM call. Given the
   cleaned directory text and `area_hint`, returns a JSON array of
   `{"name": ..., "title": ..., "profile_url": ...}` for **everyone listed in that
   area** — no topical filtering. The caller (the user) reviews and removes
   irrelevant entries manually via the existing `needs_review` workflow after upsert.
4. **Per faculty: fetch + clean profile page** the same way (steps 1-2).
5. **`extract_faculty_fields(name, title, bio_text, client, model)`** — existing call,
   unchanged signature, now receives the cleaned profile text directly instead of a
   `parse_bio`-extracted string.

### Pipeline dispatch change

`pipeline.py`'s `scrape_school`:

```python
def scrape_school(config, client, model, limit=None):
    if config.slug in SCRAPER_MODULES:
        module = SCRAPER_MODULES[config.slug]
        stubs = module.scrape_faculty_list(config)
        bio_fn = module.scrape_bio
    else:
        stubs = generic.scrape_faculty_list(config, client, model)
        bio_fn = generic.scrape_bio
    ...
```

Output record shape, `_bio_hash`, and the rest of `scrape_school`/`run_pipeline` are
unchanged — `upsert.py` and downstream OpenAlex enrichment work without modification.

### New Supabase `schools` rows required

`upsert.py`'s `get_school_id` looks up schools by slug, so each pilot school needs a row
in the `schools` table before upsert can run. Following the established pattern for
production writes, SQL `insert` statements for the pilot schools' `schools` rows will be
provided for the user to run via the Supabase dashboard — not executed directly by the
agent.

## Pilot Schools

8-10 well-known schools spanning different site platforms/structures, to stress-test the
generic approach across diverse HTML. Exact list and directory URLs/`area_hint` values
are determined during implementation (researching each school's current faculty
directory page). Candidates: MIT Sloan, Stanford GSB, Harvard Business School, Columbia
Business School, NYU Stern, Northwestern Kellogg, UC Berkeley Haas, Michigan Ross, Duke
Fuqua, Yale SOM.

## Testing

- **`test_generic.py`**: HTML-cleaning step tested against small saved fixture HTML
  files (verify trafilatura output retains main content, drops nav/footer). LLM calls
  mocked.
- **`test_extract.py`**: new tests for `extract_faculty_list` mocking the LLM client —
  prompt construction, JSON parsing, retry/error handling (mirrors existing
  `extract_faculty_fields` tests).
- **No automated end-to-end test against live school sites.** Real-site behavior is
  validated by the pilot run itself.

## Pilot Evaluation

After running the pipeline (with `--limit` on a few faculty first, then full) for each
pilot school, review `output/<slug>.json` for:

- **Faculty list accuracy**: plausible Strategy-area roster, no obvious wrong-department
  dumps
- **Bio field quality**: `phd_institution`/`topics`/`theories`/`methodology` populated
  for most faculty (not mostly null)
- **Cost**: rough LLM call count per school (1 directory call + 1 call per faculty)
- **Failure modes**: any school whose directory page is JS-paginated, behind a search
  filter, or otherwise not capturable — listed for follow-up

**Decision point after pilot**: proceed to the remaining ~90 UTD Top 100 schools with
this approach (possibly with tweaks), or fall back to a hybrid (selector-discovery or
per-platform parsers) for problem sites. This decision and the next phase's scope will
be written up as a separate spec.
