# Generic Scraper Pilot Retrospective + Scale-Out Plan

## Pilot Retrospective

The 9-school pilot (`docs/superpowers/specs/2026-06-11-generic-scraper-pilot-design.md`,
results in `2026-06-11-generic-scraper-pilot-results.md`) validated a generic,
LLM-driven extraction path (`scraper/scraper/generic.py` +
`extract_faculty_list` + `extract_faculty_fields`) that requires no per-school
parser code.

After follow-up fixes to `fetch_rendered` (scroll/"Load More"/cookie-banner
handling) and `clean_html_to_text` (raw-text fallback for directory grids),
**all 9 pilot schools produced usable output**, now loaded into Supabase (196
faculty records total):

- **7/9 fully working** — good roster + good bio coverage (`phd_institution`
  and `topics` populated for most faculty): mit-sloan, nyu-stern,
  northwestern-kellogg, berkeley-haas, michigan-ross, duke-fuqua,
  unc-kenan-flagler.
- **2/9 accepted limitations** (documented, no further engineering planned):
  - **Harvard HBS**: full 23-faculty roster extracted correctly, but profile
    pages are protected by PerimeterX CAPTCHA — bio fields are null and need
    manual lookup via `needs_review`.
  - **Columbia CBS**: the configured page has no real faculty-roster grid (it's
    a news/topic feed) — only 1 faculty member (Gernot Wagner) was extracted.
    Remaining Columbia Strategy faculty need manual research via
    `needs_review`.

**Decision**: proceed to the remaining ~90 UTD Top 100 schools using the
generic approach as the **default and only extraction path** — no
per-platform parsers. Edge cases (bot protection, missing roster pages, JS
pagination beyond what `fetch_rendered` already handles) are handled
**case-by-case** as accepted limitations via `needs_review`, following the
HBS/Columbia precedent. Building or maintaining platform-specific parser code
across ~90 structurally diverse sites is not worth the cost given the generic
path already reached 9/9 usable output.

## Scope

**In scope:**

- A pipeline resilience improvement: per-school error isolation in
  `run_pipeline`, so one school's fetch/extraction crash doesn't abort the
  whole run.
- Compiling a working list of the remaining ~90 UTD Top 100 schools (current
  rankings, minus the 12 already covered).
- Researching each school's Strategy-area faculty directory URL, `fetch_mode`,
  and `area_hint`, and adding entries to `schools.yaml`.
- One full pipeline run across all newly-configured schools, producing
  `output/<slug>.json` per school.
- Structural validation + spot-check review of the new output.
- Adding `schools` rows to Supabase for the new schools and running
  `scraper.upsert` once for all of them.
- Recording any school that produces an empty/garbage roster as an accepted
  limitation (same pattern as HBS/Columbia), in a new "Scale-out follow-ups"
  section of the results doc.

**Out of scope:**

- Per-platform parsers or any hybrid approach (explicitly rejected — see
  Decision above).
- Individually root-causing every school-specific extraction quirk beyond
  recording it as an accepted limitation.
- OpenAlex publication enrichment for the newly added faculty (existing
  `enrich_publications` pipeline handles this once faculty are upserted; run
  separately afterward, not part of this plan).
- Re-reviewing or re-running the original 9 pilot schools.
- Schools where no reasonable Strategy-faculty directory page can be found
  during research (Stanford-GSB-style) — these are noted and excluded from
  `schools.yaml`, not forced into the generic path.

## Architecture / Changes

### 1. Pipeline resilience (`scraper/scraper/pipeline.py`)

`run_pipeline` currently calls `scrape_school(...)` for each configured school
without error handling — an unhandled exception (e.g. a Playwright
`networkidle` timeout, as happened transiently with Columbia CBS during the
pilot) aborts the entire run, losing output for all subsequent schools.

Change: wrap each school's `scrape_school(...)` call in try/except. On
exception:
- Log the school slug and exception to a summary report (printed at the end of
  the run, e.g. `"FAILED: <slug> - <exception message>"`).
- Continue to the next school (don't write/overwrite that school's output
  file).

Schools that succeed write their output as before. The end-of-run report lists
both failures (to be documented as accepted limitations or retried
individually) and successes, so a single run produces a complete picture even
if a handful of schools error out.

### 2. School list compilation

Research the current UTD Top 100 Business School Research Rankings (a publicly
published list) and produce a working list of ~90 remaining schools (name +
website), excluding the 12 already in `schools.yaml`:
wharton, chicago-booth, ucla-anderson, mit-sloan, harvard-hbs, columbia-cbs,
nyu-stern, northwestern-kellogg, berkeley-haas, michigan-ross, duke-fuqua,
unc-kenan-flagler.

### 3. Per-school research and `schools.yaml` config

For each of the ~90 schools, research:
- The school's Strategy-area faculty directory page URL (or the closest
  equivalent — e.g. a Management/Organizational Behavior department roster
  that includes Strategy faculty, as several pilot schools already do).
- `fetch_mode`: try `static` first (cheaper, faster); use `rendered` only if
  the directory page requires JS to show faculty.
- `area_hint`: free text describing how this school labels its Strategy-area
  faculty group, passed into `extract_faculty_list`.

Add one `schools.yaml` entry per school found. To keep each research task's
context manageable, this work is split into ~9 sub-batches of ~10 schools
each — but these sub-batches are purely a research-context convenience. No
pipeline run, review, or upsert happens between them; Phases below run once
across the full combined config.

Schools where no reasonable Strategy-faculty directory page exists are
recorded with a comment in `schools.yaml` (or a separate notes list) and
excluded from the config entirely.

### 4. Full pipeline run

Once all ~90 entries are in `schools.yaml`, run
`python -m scraper.pipeline` once (background task, given rendered-fetch
timings of 2-9 min/school observed in the pilot — likely several hours total
for ~90 schools). The resilience change from Section 1 ensures a single run
produces output for every school that succeeds plus a failure report for the
rest.

### 5. Review

Given the scale (~90 schools vs. 9 in the pilot), review is structural plus
spot-check rather than full manual review per school:

- **Structural check** (scripted): for each `output/<slug>.json`, verify it's
  valid JSON, non-empty, and every record has the expected fields
  (`name`, `title`, `phd_institution`, `topics`, etc.). Flag any school with
  `[]` or a roster size that looks like a wrong-department dump (e.g.
  >100 or <2 faculty as an outlier signal, not a hard rule).
- **Spot-check**: manually review ~10-15 schools spanning different site
  platforms/sizes for bio-field quality (matching the pilot's qualitative
  review of `phd_institution`/`topics` population rates).
- **Follow-ups doc**: any school producing `[]`, an exception (from the
  Section 1 report), or a structurally implausible roster gets a one-line
  entry in a new "Scale-out follow-ups" section of
  `2026-06-11-generic-scraper-pilot-results.md` (dated when this phase runs),
  following the same accepted-limitation format as HBS/Columbia. These are not
  individually root-caused as part of this plan.

### 6. Supabase load

- Insert `schools` rows for all newly-configured schools (one batch insert,
  confirmed with the user beforehand — same pattern as this session's pilot
  load).
- Run `python -m scraper.upsert` once for all schools (existing script already
  iterates over all configs with an `output/<slug>.json` present, so no
  changes needed beyond the new config entries and output files existing).

## Testing

- `run_pipeline`'s new error-isolation behavior gets a unit test: mock
  `scrape_school` to raise for one school among several, assert the other
  schools' output is still written and the exception is captured in the
  returned/printed report rather than propagating.
- No new tests for the ~90 school configs themselves — as with the pilot,
  real-site behavior is validated by the actual run, not automated tests.

## Cost / Runtime Estimate

Pilot averaged ~9 LLM calls per school (1 directory call + ~8 bio calls) and
2-9 minutes per school for rendered fetches (less for static). At ~90 schools:
roughly **~800 LLM calls** and **several hours of wall-clock runtime**, run as
a background task and monitored the same way as the pilot's full run
(`ScheduleWakeup` + log file checks + task-completion notifications).
