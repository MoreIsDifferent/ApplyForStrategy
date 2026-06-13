# Scraper Scale-Out (Remaining ~90 UTD Top 100 Schools) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the pipeline resilient to per-school failures, research and configure the remaining ~90 UTD Top 100 schools (directory URL + UTD Worldwide ranking + geography), run the full pipeline, validate the output, and load everything into Supabase.

**Architecture:** No new extraction code — the existing generic pipeline (`scraper/scraper/generic.py` + `extract_faculty_list` + `extract_faculty_fields`) is reused unchanged. Work is (1) a small resilience fix to `run_pipeline`, (2) research producing two data artifacts (`scraper/research/school_rankings.csv` and additions to `scraper/config/schools.yaml`), (3) one full pipeline run, (4) a validation script, and (5) Supabase writes mirroring the pilot's load pattern.

**Tech Stack:** Python 3.14, pytest, PyYAML, Supabase Python client, Playwright (via existing `fetch.py`).

---

## Reference: spec

This plan implements `docs/superpowers/specs/2026-06-13-scraper-scale-out-design.md`. Read it if you need the "why" behind a task — this plan focuses on the "how".

## Reference: existing `schools.yaml` entry format

```yaml
- slug: duke-fuqua
  name: "Duke Fuqua"
  directory_url: "https://areas.fuqua.duke.edu/strategy/"
  fetch_mode: rendered
  area_hint: "Strategy academic area faculty"
```

`fetch_mode` is `static` or `rendered`. `area_hint` is optional free text passed to `extract_faculty_list` to help it filter to Strategy-area faculty.

## Reference: the 12 schools already in `schools.yaml`

`wharton`, `chicago-booth`, `ucla-anderson`, `mit-sloan`, `harvard-hbs`, `columbia-cbs`, `nyu-stern`, `northwestern-kellogg`, `berkeley-haas`, `michigan-ross`, `duke-fuqua`, `unc-kenan-flagler`.

---

### Task 1: Pipeline resilience — per-school error isolation

**Files:**
- Modify: `scraper/scraper/pipeline.py:57-71`
- Test: `scraper/tests/test_pipeline.py`

`run_pipeline` currently calls `scrape_school(...)` for each school with no error handling. One school's exception (e.g. a Playwright `networkidle` timeout) aborts the whole run and silently drops output for every school after it. This task makes `run_pipeline` continue past a failing school and return a list of failures so the caller (and `__main__`) can report them.

- [ ] **Step 1: Write the failing test**

Add to `scraper/tests/test_pipeline.py` (append at end of file):

```python
def test_run_pipeline_continues_after_school_error(tmp_path, monkeypatch):
    config_path = tmp_path / "schools.yaml"
    config_path.write_text(
        "- slug: school-a\n"
        "  name: School A\n"
        "  directory_url: https://example.edu/a\n"
        "  fetch_mode: static\n"
        "- slug: school-b\n"
        "  name: School B\n"
        "  directory_url: https://example.edu/b\n"
        "  fetch_mode: static\n"
    )
    output_dir = tmp_path / "output"

    good_record = {
        "name": "Jane Doe",
        "title": "Professor",
        "school_profile_url": "https://example.edu/jane-doe",
        "personal_website_url": None,
        "google_scholar_url": None,
        "phd_institution": None,
        "methodology": None,
        "topics": [],
        "theories": [],
        "bio_hash": "sha256:abc",
    }

    def fake_scrape_school(config, client, model, limit=None):
        if config.slug == "school-a":
            raise RuntimeError("boom")
        return [good_record]

    monkeypatch.setattr(pipeline_module, "scrape_school", fake_scrape_school)
    monkeypatch.setattr(pipeline_module, "build_client", lambda: MagicMock())
    monkeypatch.setattr(pipeline_module, "get_model", lambda: "test-model")

    failures = pipeline_module.run_pipeline(config_path, output_dir)

    assert failures == [("school-a", "boom")]
    assert not (output_dir / "school-a.json").exists()

    output_file = output_dir / "school-b.json"
    assert output_file.exists()
    data = json.loads(output_file.read_text())
    assert data[0]["name"] == "Jane Doe"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "scraper" && .venv/bin/pytest tests/test_pipeline.py::test_run_pipeline_continues_after_school_error -v`
Expected: FAIL — either `RuntimeError: boom` propagates uncaught, or `run_pipeline` returns `None` so `failures == [("school-a", "boom")]` fails.

- [ ] **Step 3: Write minimal implementation**

Replace `run_pipeline` in `scraper/scraper/pipeline.py:57-71` with:

```python
def run_pipeline(
    config_path: Path, output_dir: Path, school_slug: str | None = None, limit: int | None = None
) -> list[tuple[str, str]]:
    configs = load_school_configs(config_path)
    if school_slug:
        configs = [c for c in configs if c.slug == school_slug]

    client = build_client()
    model = get_model()

    output_dir.mkdir(parents=True, exist_ok=True)
    failures: list[tuple[str, str]] = []
    for config in configs:
        try:
            records = scrape_school(config, client, model, limit=limit)
        except Exception as exc:
            failures.append((config.slug, str(exc)))
            continue
        output_path = output_dir / f"{config.slug}.json"
        output_path.write_text(json.dumps(records, indent=2))

    if failures:
        print("=== Pipeline run summary: failures ===")
        for slug, message in failures:
            print(f"FAILED: {slug} - {message}")

    return failures
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "scraper" && .venv/bin/pytest tests/test_pipeline.py -v`
Expected: all tests PASS, including the new one.

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/pipeline.py scraper/tests/test_pipeline.py
git commit -m "feat(scraper): isolate per-school errors in run_pipeline"
```

---

### Task 2: UTD Worldwide rankings + ~90-school list research

**Files:**
- Create: `scraper/research/school_rankings.csv`
- Create: `scraper/research/excluded_schools.md`

This task produces the master data file the rest of the plan reads from. No code changes.

- [ ] **Step 1: Find the UTD Top 100 Worldwide rankings data source**

The page `https://jsom.utdallas.edu/the-utd-top-100-business-school-research-rankings/worldRankings` renders its table via client-side JS/AJAX (confirmed during brainstorming — static fetch returns only a 9483-byte UI shell, no `<table>` rows).

Try, in order, until one yields a full 100-row table for a recent year (2021-2025 range):
1. Use the Playwright MCP tools (`mcp__playwright__browser_navigate` to the URL, then `mcp__playwright__browser_snapshot` or `mcp__playwright__browser_evaluate` to read the rendered table after it loads) — this is the most direct way to get the JS-rendered table content.
2. If that doesn't load a usable table, use `mcp__playwright__browser_network_requests` after navigating to the page to find the AJAX endpoint the table JS calls, then fetch that endpoint directly (e.g. via `WebFetch` or `curl`) for the Worldwide ranking data.
3. If neither works, search for a cached/mirrored copy of the UTD Worldwide rankings table (e.g. PDF mirrors at `colorado.edu/business` or `haslam.utk.edu`, as found during brainstorming) and use the most recent one.

If a genuine Worldwide table cannot be retrieved by any of the above, fall back to the UTD **North American** rankings table at `https://jsom.utdallas.edu/the-utd-top-100-business-school-research-rankings/northRankings` (same retrieval approach), and note this substitution at the top of `scraper/research/school_rankings.csv` as a comment line: `# NOTE: ranking_utd values are North American rank, not Worldwide — Worldwide table was not retrievable on <date>`.

- [ ] **Step 2: Build `scraper/research/school_rankings.csv`**

One row per school in the ranking table (top 100, or however many rows the retrieved table has), with columns:

```
rank,slug,name,geography,website_url,in_schools_yaml,notes
```

- `rank`: the UTD rank (integer) from Step 1's table.
- `slug`: a kebab-case slug. For the 12 schools already in `schools.yaml`, use their **existing** slugs exactly (`wharton`, `chicago-booth`, `ucla-anderson`, `mit-sloan`, `harvard-hbs`, `columbia-cbs`, `nyu-stern`, `northwestern-kellogg`, `berkeley-haas`, `michigan-ross`, `duke-fuqua`, `unc-kenan-flagler`). For new schools, derive a slug from the school's common short name (e.g. "University of Texas at Austin (McCombs)" → `texas-mccombs`), matching the style of existing slugs.
- `name`: display name, matching the style of existing `schools.yaml` `name` fields (e.g. `"Duke Fuqua"`, `"UC Berkeley Haas"`).
- `geography`: one of `"Northeast"`, `"Midwest"`, `"West Coast"`, `"South"`, `"International"` (or another region label if the school is outside the US — match the style already implied by the existing schools' locations), based on the school's actual location.
- `website_url`: the school's main business-school website (e.g. `https://www.kelley.iu.edu`), found via a quick web search per school.
- `in_schools_yaml`: `yes` for the 12 existing slugs, `no` for everything else.
- `notes`: free text, usually empty. Use it for anything ambiguous (e.g. "rank tied with X").

Order rows by `rank` ascending. This file should have ~100 data rows (plus the optional `#`-comment line from Step 1 if the North American fallback was used).

- [ ] **Step 3: Create `scraper/research/excluded_schools.md`**

Create an empty placeholder section for schools later found (during Task 3's sub-batches) to have no findable Strategy faculty directory:

```markdown
# Schools excluded from `schools.yaml`

Schools from `school_rankings.csv` that, after directory research in Task 3, had no
findable Strategy-area faculty directory page and were therefore not added to
`schools.yaml` (Stanford-GSB-style exclusion).

| Slug | Name | Reason |
|------|------|--------|
```

Sub-batch tasks (Task 3 onward) append rows to this table as needed.

- [ ] **Step 4: Commit**

```bash
git add scraper/research/school_rankings.csv scraper/research/excluded_schools.md
git commit -m "research(scraper): UTD Worldwide rankings + ~90-school candidate list"
```

---

### Task 3: Per-school directory research — sub-batch 1 (ranks 13-22)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

This is the first of ~9 sub-batches. Each sub-batch researches ~10 schools from `scraper/research/school_rankings.csv` (sorted by `rank`, skipping rows where `in_schools_yaml == yes`) and appends entries to `scraper/config/schools.yaml`.

This sub-batch covers the schools with `in_schools_yaml == no` and the lowest (best) ranks — i.e. the first ~10 such rows in rank order. If fewer than 10 such rows exist in this rank range, process all of them and move on (later sub-batches will cover higher ranks).

- [ ] **Step 1: For each school in this sub-batch, find its Strategy-area faculty directory page**

For each school, in order:
1. Start from the `website_url` in `school_rankings.csv` and search (web search or by browsing the site) for a faculty directory page focused on Strategy, Management, or a combined Strategy/Org-Behavior/Entrepreneurship area — following the precedent of the 12 existing entries (e.g. `duke-fuqua`'s `areas.fuqua.duke.edu/strategy/`, `berkeley-haas`'s MORS group page, `nyu-stern`'s Management & Organizations department page).
2. If no Strategy-specific page exists but a general faculty directory supports filtering by department/area (e.g. `?department=Strategy` or similar query param), use that filtered URL.
3. If neither exists, use the closest department-level roster that plausibly includes Strategy faculty (Management, Organizational Behavior, Strategy & Entrepreneurship, etc.) — same pattern as `mit-sloan`'s TIES group or `nyu-stern`'s Management & Organizations roster.
4. If **no** roster page of any kind can be found for the school (Stanford-GSB-style), do not add a `schools.yaml` entry — instead append a row to the table in `scraper/research/excluded_schools.md`:
   ```markdown
   | <slug> | <name> | No findable Strategy/Management faculty directory page |
   ```

- [ ] **Step 2: Determine `fetch_mode` for each school**

For each school with a directory URL from Step 1:
1. Fetch the URL with `WebFetch` (static fetch). If the response includes recognizable faculty names/titles in the content, set `fetch_mode: static`.
2. If the static fetch returns only navigation/boilerplate (similar to the Northwestern Kellogg pilot case — a landing page with no individual faculty), set `fetch_mode: rendered`.
3. Default to `rendered` if unsure — it's slower but more robust (per the pilot's `fetch_rendered` scroll/click/cookie-banner handling).

- [ ] **Step 3: Write an `area_hint` for each school**

One sentence describing how this school's site labels the Strategy-area faculty group, in the style of existing entries, e.g.:
- `"Strategy academic area faculty"` (duke-fuqua)
- `"Management of Organizations (MORS) Group ladder faculty (covers strategy and organizational behavior)"` (berkeley-haas)
- `"Faculty whose title includes 'Strategy and Entrepreneurship'..."` (unc-kenan-flagler)

If the directory page is already Strategy-specific and contains no other areas, `area_hint` can be omitted (see `harvard-hbs`/`columbia-cbs` for the minimal one-liner style, or `wharton`/`chicago-booth`/`ucla-anderson` which omit it entirely).

- [ ] **Step 4: Append entries to `scraper/config/schools.yaml`**

For each school that has a directory page, append an entry in this exact format (matching the existing 12 entries' style):

```yaml
- slug: <slug-from-csv>
  name: "<name-from-csv>"
  directory_url: "<url-from-step-1>"
  fetch_mode: <static-or-rendered-from-step-2>
  area_hint: "<hint-from-step-3>"
```

Omit the `area_hint` line if Step 3 decided it's unnecessary.

- [ ] **Step 5: Validate YAML syntax**

Run: `cd "scraper" && .venv/bin/python -c "from scraper.config import load_school_configs; from pathlib import Path; cfgs = load_school_configs(Path('config/schools.yaml')); print(len(cfgs), 'schools loaded')"`
Expected: prints a count equal to `12 + <number of entries added so far>`, no exception.

- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 13-22"
```

---

### Task 4: Per-school directory research — sub-batch 2 (ranks 23-32)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, in rank order, continuing from where sub-batch 1 left off (the ~10 lowest-rank `no` rows not yet covered).

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3 (find directory page or mark excluded; determine `fetch_mode`; write `area_hint`; append to `schools.yaml`).

- [ ] **Step 5: Validate YAML syntax**

Run: `cd "scraper" && .venv/bin/python -c "from scraper.config import load_school_configs; from pathlib import Path; cfgs = load_school_configs(Path('config/schools.yaml')); print(len(cfgs), 'schools loaded')"`
Expected: count increases by the number of entries added in this sub-batch, no exception.

- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 23-32"
```

---

### Task 5: Per-school directory research — sub-batch 3 (ranks 33-42)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 33-42"
```

---

### Task 6: Per-school directory research — sub-batch 4 (ranks 43-52)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 43-52"
```

---

### Task 7: Per-school directory research — sub-batch 5 (ranks 53-62)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 53-62"
```

---

### Task 8: Per-school directory research — sub-batch 6 (ranks 63-72)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 63-72"
```

---

### Task 9: Per-school directory research — sub-batch 7 (ranks 73-82)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 73-82"
```

---

### Task 10: Per-school directory research — sub-batch 8 (ranks 83-92)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to the next ~10 schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no`, continuing in rank order.

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for schools ranked 83-92"
```

---

### Task 11: Per-school directory research — sub-batch 9 (remaining schools)

**Files:**
- Modify: `scraper/config/schools.yaml`
- Modify: `scraper/research/excluded_schools.md` (only if exclusions found)

Apply the exact same process as Task 3 (Steps 1-6), to **all remaining** schools from `scraper/research/school_rankings.csv` with `in_schools_yaml == no` not yet covered by sub-batches 1-8 (this batch may have fewer or more than 10 schools, depending on how many rows `school_rankings.csv` ended up with and how many were excluded along the way).

- [ ] **Step 1-4: Research and configure each school** — same sub-steps as Task 3.
- [ ] **Step 5: Validate YAML syntax** — same command as Task 3 Step 5. The printed count should now equal `12 + (number of rows in school_rankings.csv with in_schools_yaml == no) - (number of rows added to excluded_schools.md)`.
- [ ] **Step 6: Commit**

```bash
git add scraper/config/schools.yaml scraper/research/excluded_schools.md
git commit -m "research(scraper): directory config for remaining ranked schools"
```

---

### Task 12: Full pipeline run

**Files:**
- None modified directly — produces `scraper/output/<slug>.json` for every new school in `schools.yaml`.

- [ ] **Step 1: Confirm env is configured**

Run: `cd "scraper" && cat .env | grep -E "OPENAI|ANTHROPIC|MODEL"` (or whatever LLM provider variables `scraper/scraper/extract.py`'s `build_client`/`get_model` expect) to confirm credentials are present. Do not print or commit secret values.

- [ ] **Step 2: Run the full pipeline as a background task**

Run (background, this will take several hours for ~90 schools per the pilot's 2-9 min/school timings):

```bash
cd "scraper" && set -a && source .env && set +a && .venv/bin/python -m scraper.pipeline > /tmp/scale_out_run.log 2>&1
```

Use `run_in_background: true` for this command. The Section 1 resilience change (Task 1) means a single run produces `output/<slug>.json` for every school that succeeds, plus a `FAILED: <slug> - <message>` line in `/tmp/scale_out_run.log` for any that error out — do not re-run per-school on individual failures; record them instead in Task 13's follow-ups doc.

- [ ] **Step 3: Wait for completion and capture the failure summary**

When the background task completes, run: `grep "^FAILED:" /tmp/scale_out_run.log`
Record the output (school slug + error message per line) for use in Task 13.

---

### Task 13: Output validation + spot-check review

**Files:**
- Create: `scraper/scraper/validate.py`
- Test: `scraper/tests/test_validate.py`
- Modify: `docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md` (new "Scale-out follow-ups" section)

A small validation script checks structural correctness of every `output/<slug>.json` produced in Task 12, then a manual spot-check covers bio-field quality for a sample of schools.

- [ ] **Step 1: Write the failing test**

Create `scraper/tests/test_validate.py`:

```python
import json

from scraper.validate import validate_output_dir

REQUIRED_FIELDS = {
    "name",
    "title",
    "school_profile_url",
    "personal_website_url",
    "google_scholar_url",
    "phd_institution",
    "methodology",
    "topics",
    "theories",
    "bio_hash",
}


def _record(**overrides):
    base = {
        "name": "Jane Doe",
        "title": "Professor",
        "school_profile_url": "https://example.edu/jane-doe",
        "personal_website_url": None,
        "google_scholar_url": None,
        "phd_institution": "MIT",
        "methodology": "Quantitative",
        "topics": ["Strategy"],
        "theories": [],
        "bio_hash": "sha256:abc",
    }
    base.update(overrides)
    return base


def test_validate_flags_empty_roster(tmp_path):
    (tmp_path / "empty-school.json").write_text(json.dumps([]))

    issues = validate_output_dir(tmp_path)

    assert any("empty-school" in issue and "empty roster" in issue for issue in issues)


def test_validate_flags_missing_fields(tmp_path):
    record = _record()
    del record["topics"]
    (tmp_path / "bad-school.json").write_text(json.dumps([record]))

    issues = validate_output_dir(tmp_path)

    assert any("bad-school" in issue and "topics" in issue for issue in issues)


def test_validate_flags_invalid_json(tmp_path):
    (tmp_path / "broken-school.json").write_text("not json")

    issues = validate_output_dir(tmp_path)

    assert any("broken-school" in issue and "invalid JSON" in issue for issue in issues)


def test_validate_flags_outlier_roster_size(tmp_path):
    (tmp_path / "tiny-school.json").write_text(json.dumps([_record()]))

    issues = validate_output_dir(tmp_path)

    assert any("tiny-school" in issue and "roster size" in issue for issue in issues)


def test_validate_passes_clean_output(tmp_path):
    records = [_record(name=f"Person {i}") for i in range(10)]
    (tmp_path / "good-school.json").write_text(json.dumps(records))

    issues = validate_output_dir(tmp_path)

    assert not any("good-school" in issue for issue in issues)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "scraper" && .venv/bin/pytest tests/test_validate.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.validate'`.

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/validate.py`:

```python
import json
from pathlib import Path

REQUIRED_FIELDS = {
    "name",
    "title",
    "school_profile_url",
    "personal_website_url",
    "google_scholar_url",
    "phd_institution",
    "methodology",
    "topics",
    "theories",
    "bio_hash",
}

MIN_PLAUSIBLE_ROSTER = 2
MAX_PLAUSIBLE_ROSTER = 100


def validate_output_dir(output_dir: Path) -> list[str]:
    issues: list[str] = []

    for path in sorted(output_dir.glob("*.json")):
        slug = path.stem
        try:
            records = json.loads(path.read_text())
        except json.JSONDecodeError:
            issues.append(f"{slug}: invalid JSON")
            continue

        if not isinstance(records, list) or len(records) == 0:
            issues.append(f"{slug}: empty roster")
            continue

        for index, record in enumerate(records):
            missing = REQUIRED_FIELDS - set(record.keys())
            if missing:
                issues.append(f"{slug}: record {index} missing fields {sorted(missing)}")

        if not (MIN_PLAUSIBLE_ROSTER <= len(records) <= MAX_PLAUSIBLE_ROSTER):
            issues.append(
                f"{slug}: roster size {len(records)} outside plausible range "
                f"[{MIN_PLAUSIBLE_ROSTER}, {MAX_PLAUSIBLE_ROSTER}]"
            )

    return issues


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    found_issues = validate_output_dir(repo_root / "output")
    if found_issues:
        print("=== Validation issues ===")
        for issue in found_issues:
            print(issue)
    else:
        print("No issues found.")
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "scraper" && .venv/bin/pytest tests/test_validate.py -v`
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/validate.py scraper/tests/test_validate.py
git commit -m "feat(scraper): add output validation script"
```

- [ ] **Step 6: Run validation against the real output directory**

Run: `cd "scraper" && .venv/bin/python -m scraper.validate`
Record the printed issues (if any).

- [ ] **Step 7: Spot-check ~10-15 schools**

Pick 10-15 `output/<slug>.json` files spanning different ranks/site platforms (include any flagged by Step 6). For each, open the file and check:
- `phd_institution` populated for a majority of records (matches pilot's "good bio coverage" bar).
- `topics` non-empty for a majority of records.
- `name`/`title` values look like real faculty (not nav-menu text or article titles).

- [ ] **Step 8: Record follow-ups**

Open `docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md` and append a new section at the end:

```markdown
## Scale-out follow-ups (<TODAY'S DATE>)

Schools from the ~90-school scale-out that produced an empty roster, a pipeline
exception (Task 12), or a structurally implausible roster (Task 13 validation),
recorded as accepted limitations following the HBS/Columbia precedent — no
further engineering effort planned for these:

- **<slug>**: <one-line reason, e.g. "empty roster — directory page has no
  individual faculty entries">
- ...
```

List one bullet per school flagged by Task 12's `FAILED:` lines or Task 13's
`validate_output_dir` issues. If none, write: "No schools required follow-up —
all newly-configured schools produced a structurally valid, non-empty roster."

- [ ] **Step 9: Commit**

```bash
git add docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md
git commit -m "docs(scraper): record scale-out follow-ups"
```

---

### Task 14: Supabase load — new schools, ranking/geography metadata, faculty upsert

**Files:**
- Create: `scraper/scraper/sync_school_metadata.py`
- Test: `scraper/tests/test_sync_school_metadata.py`

This mirrors the pilot's Supabase load (insert `schools` rows, then run `scraper.upsert` for faculty), plus writes `ranking_utd`/`geography`/`website_url` from `scraper/research/school_rankings.csv` for both the new schools and the 12 existing ones.

**All steps that write to the production Supabase database (Steps 5 and 7) require explicit user confirmation before running**, following the same pattern used for the pilot's Supabase load — describe exactly what will be inserted/updated and how many rows, and wait for an explicit "yes" before executing.

- [ ] **Step 1: Write the failing test**

Create `scraper/tests/test_sync_school_metadata.py`:

```python
from scraper.sync_school_metadata import sync_school_metadata
from tests.fake_supabase import FakeSupabaseClient


def test_inserts_new_school_with_metadata():
    client = FakeSupabaseClient()

    sync_school_metadata(
        client,
        [
            {
                "slug": "texas-mccombs",
                "name": "Texas McCombs",
                "geography": "South",
                "ranking_utd": 15,
                "website_url": "https://www.mccombs.utexas.edu",
            }
        ],
    )

    rows = client.tables["schools"].rows
    assert len(rows) == 1
    assert rows[0]["slug"] == "texas-mccombs"
    assert rows[0]["geography"] == "South"
    assert rows[0]["ranking_utd"] == 15
    assert rows[0]["website_url"] == "https://www.mccombs.utexas.edu"


def test_updates_existing_school_metadata_without_changing_slug_or_name():
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"slug": "duke-fuqua", "name": "Duke Fuqua", "geography": None, "ranking_utd": None, "website_url": None}],
    )

    sync_school_metadata(
        client,
        [
            {
                "slug": "duke-fuqua",
                "name": "Duke Fuqua",
                "geography": "South",
                "ranking_utd": 11,
                "website_url": "https://www.fuqua.duke.edu",
            }
        ],
    )

    rows = client.tables["schools"].rows
    assert len(rows) == 1
    assert rows[0]["slug"] == "duke-fuqua"
    assert rows[0]["name"] == "Duke Fuqua"
    assert rows[0]["geography"] == "South"
    assert rows[0]["ranking_utd"] == 11
    assert rows[0]["website_url"] == "https://www.fuqua.duke.edu"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "scraper" && .venv/bin/pytest tests/test_sync_school_metadata.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.sync_school_metadata'`.

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/sync_school_metadata.py`:

```python
import csv
import os
from pathlib import Path


def sync_school_metadata(supabase, rows: list[dict]) -> None:
    for row in rows:
        existing = supabase.table("schools").select("id").eq("slug", row["slug"]).execute()
        metadata = {
            "geography": row["geography"],
            "ranking_utd": row["ranking_utd"],
            "website_url": row["website_url"],
        }
        if existing.data:
            supabase.table("schools").update(metadata).eq("slug", row["slug"]).execute()
        else:
            supabase.table("schools").insert(
                {"slug": row["slug"], "name": row["name"], **metadata}
            ).execute()


def load_rows_from_csv(path: Path) -> list[dict]:
    rows = []
    with open(path) as f:
        for row in csv.DictReader(f):
            if row["rank"].startswith("#"):
                continue
            rows.append(
                {
                    "slug": row["slug"],
                    "name": row["name"],
                    "geography": row["geography"],
                    "ranking_utd": int(row["rank"]),
                    "website_url": row["website_url"],
                }
            )
    return rows


def main() -> None:
    from supabase import create_client

    repo_root = Path(__file__).resolve().parent.parent
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows = load_rows_from_csv(repo_root / "research" / "school_rankings.csv")
    sync_school_metadata(client, rows)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "scraper" && .venv/bin/pytest tests/test_sync_school_metadata.py -v`
Expected: both tests PASS.

Then run the full test suite to confirm nothing else broke:

Run: `cd "scraper" && .venv/bin/pytest -v`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/sync_school_metadata.py scraper/tests/test_sync_school_metadata.py
git commit -m "feat(scraper): sync schools table ranking/geography metadata from research CSV"
```

- [ ] **Step 6: Run `sync_school_metadata` against production Supabase (requires explicit user confirmation)**

Before running, state explicitly: "This will insert N new rows into `schools` (one per new school in `schools.yaml` not yet in the table) and update `geography`/`ranking_utd`/`website_url` for the 12 existing rows, based on `scraper/research/school_rankings.csv`. Proceed?" — wait for an explicit "yes".

Once confirmed, run:

```bash
cd "scraper" && set -a && source .env && set +a && .venv/bin/python -m scraper.sync_school_metadata
```

- [ ] **Step 7: Run `scraper.upsert` for all newly-configured schools (requires explicit user confirmation)**

Before running, state explicitly: "This will run `scraper.upsert`, which iterates every config in `schools.yaml` with an `output/<slug>.json` present and upserts faculty rows (new faculty get `needs_review=True`). This will add faculty for all ~<N> newly-configured schools from Task 12's output. Proceed?" — wait for an explicit "yes".

Once confirmed, run:

```bash
cd "scraper" && set -a && source .env && set +a && .venv/bin/python -m scraper.upsert
```

- [ ] **Step 8: Verify row counts**

Run a quick count check (e.g. via the Supabase client or `supabase` SQL) comparing the number of `faculty` rows per new `school_id` against the record count in the corresponding `output/<slug>.json` — they should match, mirroring the verification done for the pilot's 9 schools.

---

## Self-Review Notes

- **Spec coverage**: pipeline resilience (Task 1), ~90-school list + UTD Worldwide ranking research (Task 2), per-school directory/`schools.yaml` research in ~9 sub-batches (Tasks 3-11), full pipeline run (Task 12), structural validation + spot-check + follow-ups doc (Task 13), Supabase load including ranking/geography for new and existing schools + faculty upsert (Task 14). All "in scope" bullets from the spec are covered. "Out of scope" items (per-platform parsers, OpenAlex enrichment, re-reviewing the original 9) are correctly absent.
- **Placeholder scan**: research tasks (2-11) specify exact file paths, CSV schema, and `schools.yaml` entry format rather than vague "research the school" steps; code tasks (1, 13, 14) have complete test + implementation code.
- **Type/signature consistency**: `run_pipeline` now returns `list[tuple[str, str]]` (Task 1); `validate_output_dir(output_dir: Path) -> list[str]` (Task 13); `sync_school_metadata(supabase, rows: list[dict]) -> None` and `load_rows_from_csv(path: Path) -> list[dict]` (Task 14) — all used consistently within their tasks.
