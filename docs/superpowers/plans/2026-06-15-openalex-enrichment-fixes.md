# OpenAlex Enrichment Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 1000-row pagination cap in `enrich_publications.run()`, fix institution-ID resolution so it works for ~95% of schools (not just 5%), reset the 1005 faculty incorrectly flagged `ambiguous`, and re-run full enrichment.

**Architecture:** Two small, focused additions to `scraper/scraper/openalex.py` (new search helper functions), a new standalone script `scraper/scraper/resolve_institutions.py` (report/apply/reset CLI, following the `categorize_topics.py` pattern), a pagination fix to `enrich_publications.run()`, and an extension to the test double `tests/fake_supabase.py` to support `.range()` and `.is_()`. The final task is an operational task (no new code) that runs the scripts against production and re-runs enrichment.

**Tech Stack:** Python, pytest, supabase-py (via `FakeSupabaseClient` test double), OpenAlex REST API.

---

## Task 1: Add institution search helpers to `openalex.py`

**Files:**
- Modify: `scraper/scraper/openalex.py`
- Test: `tests/test_openalex.py`

- [ ] **Step 1: Write the failing tests**

Add to `tests/test_openalex.py`:

```python
def test_search_institutions_by_phrase_returns_summaries(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {
                        "id": "https://openalex.org/I61544103",
                        "display_name": "London Business School",
                        "works_count": 5000,
                        "homepage_url": "https://www.london.edu",
                    }
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    results = openalex.search_institutions_by_phrase("London Business School")

    assert results == [
        {
            "id": "I61544103",
            "display_name": "London Business School",
            "works_count": 5000,
            "homepage_url": "https://www.london.edu",
        }
    ]
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["filter"] == "display_name.search:London Business School"


def test_search_institutions_returns_summaries(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {
                        "id": "https://openalex.org/I136199984",
                        "display_name": "Harvard University",
                        "works_count": 500000,
                        "homepage_url": "https://www.harvard.edu",
                    }
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    results = openalex.search_institutions("Harvard")

    assert results == [
        {
            "id": "I136199984",
            "display_name": "Harvard University",
            "works_count": 500000,
            "homepage_url": "https://www.harvard.edu",
        }
    ]
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["search"] == "Harvard"


def test_search_institutions_returns_empty_list_when_no_results(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    assert openalex.search_institutions("Nonexistent University Xyzzy") == []
```

These reuse the existing `_response(json_data)` helper already defined in `tests/test_openalex.py`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_openalex.py -k search_institutions -v`
Expected: FAIL with `AttributeError: module 'scraper.openalex' has no attribute 'search_institutions_by_phrase'` (and similar for `search_institutions`).

- [ ] **Step 3: Write minimal implementation**

In `scraper/scraper/openalex.py`, add these functions near `resolve_institution_id` (which already uses `_get` and `_short_id`):

```python
def _institution_summary(result: dict) -> dict:
    return {
        "id": _short_id(result["id"]),
        "display_name": result.get("display_name"),
        "works_count": result.get("works_count"),
        "homepage_url": result.get("homepage_url"),
    }


def search_institutions_by_phrase(name: str, per_page: int = 1) -> list[dict]:
    data = _get("/institutions", {"filter": f"display_name.search:{name}", "per_page": per_page})
    return [_institution_summary(result) for result in data.get("results") or []]


def search_institutions(query: str, per_page: int = 1) -> list[dict]:
    data = _get("/institutions", {"search": query, "per_page": per_page})
    return [_institution_summary(result) for result in data.get("results") or []]
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_openalex.py -v`
Expected: PASS (all tests, including the 3 new ones)

- [ ] **Step 5: Commit**

```bash
cd scraper && git add scraper/scraper/openalex.py tests/test_openalex.py
git commit -m "Add OpenAlex institution search helpers for resolution heuristic"
```

---

## Task 2: Extend `FakeQuery` to support `.range()` and `.is_()`

**Files:**
- Modify: `tests/fake_supabase.py`

This task has no standalone test — it's a test-infrastructure change exercised by Tasks 3 and 4. Read the current file first to confirm exact structure before editing.

- [ ] **Step 1: Read the current file**

Run: `cd scraper && cat tests/fake_supabase.py`

Confirm the `FakeQuery.__init__` signature and the `execute()` method's select branch, and the `_matches` method's filter-kind dispatch (currently handles `eq` and `ilike`).

- [ ] **Step 2: Add `range_bounds` to `__init__` and add `.range()` / `.is_()` methods**

In `FakeQuery.__init__`, add:

```python
        self.range_bounds = None
```

Add new methods alongside `eq`/`ilike`:

```python
    def range(self, start, end):
        self.range_bounds = (start, end)
        return self

    def is_(self, col, value):
        self.filters.append(("is", col, value))
        return self
```

- [ ] **Step 3: Handle the `"is"` filter kind in `_matches`**

In `_matches`, alongside the existing `eq`/`ilike` branches, add:

```python
            elif kind == "is":
                is_null = row.get(col) is None
                if value == "null" and not is_null:
                    return False
                if value != "null" and is_null:
                    return False
```

- [ ] **Step 4: Apply `range_bounds` in the select branch of `execute()`**

In the `select` branch of `execute()`, after building the filtered `matched` list and before returning `FakeResult(matched)`, add:

```python
        if self.op == "select" and self.range_bounds is not None:
            start, end = self.range_bounds
            matched = matched[start : end + 1]
```

(Place this immediately before the `return FakeResult(matched)` line in the select branch — adjust variable name if the existing code calls it something other than `matched`.)

- [ ] **Step 5: Run the full test suite to verify nothing broke**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest -q`
Expected: PASS (same count as before, no new tests yet — this step just confirms the refactor didn't break existing behavior)

- [ ] **Step 6: Commit**

```bash
cd scraper && git add tests/fake_supabase.py
git commit -m "Add .range() and .is_() support to FakeQuery test double"
```

---

## Task 3: Fix pagination in `enrich_publications.run()`

**Files:**
- Modify: `scraper/scraper/enrich_publications.py`
- Test: `tests/test_enrich_publications.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_enrich_publications.py`:

```python
def test_run_paginates_through_all_faculty(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"}],
    )
    client.seed(
        "faculty",
        [
            {"id": "fac-1", "name": "A", "school_id": "school-1", "openalex_author_id": "A1", "needs_review": False},
            {"id": "fac-2", "name": "B", "school_id": "school-1", "openalex_author_id": "A2", "needs_review": False},
            {"id": "fac-3", "name": "C", "school_id": "school-1", "openalex_author_id": "A3", "needs_review": False},
        ],
    )

    monkeypatch.setattr(enrich_publications, "PAGE_SIZE", 2)
    monkeypatch.setattr(openalex, "find_author", MagicMock())
    monkeypatch.setattr(openalex, "fetch_works", MagicMock(return_value=[]))

    enrich_publications.run(client)

    openalex.find_author.assert_not_called()
    assert openalex.fetch_works.call_count == 3
```

Check the top of `tests/test_enrich_publications.py` for the existing imports (`enrich_publications`, `openalex`, `MagicMock`, `FakeSupabaseClient`) — they should already be imported by the existing tests, so no new imports should be needed. If `MagicMock` isn't already imported, add `from unittest.mock import MagicMock`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_enrich_publications.py::test_run_paginates_through_all_faculty -v`
Expected: FAIL — with `PAGE_SIZE = 2` monkeypatched onto a module that doesn't define `PAGE_SIZE`, this raises `AttributeError: <module 'scraper.enrich_publications'> does not have the attribute 'PAGE_SIZE'` (monkeypatch refuses to set an attribute that doesn't exist by default).

- [ ] **Step 3: Write minimal implementation**

In `scraper/scraper/enrich_publications.py`, add `import itertools` at the top, define `PAGE_SIZE = 1000` as a module-level constant, and replace the body of `run()`:

```python
import itertools
import os

from scraper import openalex

PAGE_SIZE = 1000


def upsert_publication(supabase, faculty_id: str, work: dict) -> None:
    ...  # unchanged


def enrich_faculty(supabase, faculty_row: dict, institution_cache: dict[str, str | None]) -> None:
    ...  # unchanged


def run(supabase, school_slug: str | None = None, limit: int | None = None) -> None:
    query = supabase.table("faculty").select("id, name, school_id, openalex_author_id")
    if school_slug:
        school = supabase.table("schools").select("id").eq("slug", school_slug).execute().data[0]
        query = query.eq("school_id", school["id"])

    rows: list[dict] = []
    for offset in itertools.count(0, PAGE_SIZE):
        page = query.range(offset, offset + PAGE_SIZE - 1).execute().data
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break

    if limit is not None:
        rows = rows[:limit]

    institution_cache: dict[str, str | None] = {}
    for row in rows:
        enrich_faculty(supabase, row, institution_cache)
```

Only the imports, the new `PAGE_SIZE` constant, and the body of `run()` change. `upsert_publication`, `enrich_faculty`, and `main()` stay as-is.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_enrich_publications.py -v`
Expected: PASS (all 5 tests, including the new pagination test)

- [ ] **Step 5: Run the full test suite**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest -q`
Expected: PASS (64 tests — 63 existing + 1 new)

- [ ] **Step 6: Commit**

```bash
cd scraper && git add scraper/scraper/enrich_publications.py tests/test_enrich_publications.py
git commit -m "Fix 1000-row pagination cap in enrich_publications.run()"
```

---

## Task 4: Create `resolve_institutions.py` with suffix-stripping heuristic

**Files:**
- Create: `scraper/scraper/resolve_institutions.py`
- Test: `tests/test_resolve_institutions.py`

- [ ] **Step 1: Write the failing tests**

Create `tests/test_resolve_institutions.py`:

```python
import csv
from unittest.mock import MagicMock

from scraper import openalex, resolve_institutions
from tests.fake_supabase import FakeSupabaseClient


def test_suffix_candidates_strips_trailing_words():
    assert resolve_institutions.suffix_candidates("Harvard Business School") == ["Harvard Business", "Harvard"]
    assert resolve_institutions.suffix_candidates("Chicago Booth") == ["Chicago"]
    assert resolve_institutions.suffix_candidates("INSEAD") == []


def test_resolve_school_uses_phrase_match_when_available(monkeypatch):
    monkeypatch.setattr(
        openalex,
        "search_institutions_by_phrase",
        MagicMock(
            return_value=[
                {
                    "id": "I61544103",
                    "display_name": "London Business School",
                    "works_count": 5000,
                    "homepage_url": "https://www.london.edu",
                }
            ]
        ),
    )
    search_institutions = MagicMock()
    monkeypatch.setattr(openalex, "search_institutions", search_institutions)

    result = resolve_institutions.resolve_school("London Business School")

    assert result["id"] == "I61544103"
    assert result["query_used"] == 'phrase:"London Business School"'
    search_institutions.assert_not_called()


def test_resolve_school_falls_back_to_suffix_stripped_search(monkeypatch):
    monkeypatch.setattr(openalex, "search_institutions_by_phrase", MagicMock(return_value=[]))

    def fake_search(query, per_page=1):
        if query == "Harvard Business":
            return []
        if query == "Harvard":
            return [
                {
                    "id": "I136199984",
                    "display_name": "Harvard University",
                    "works_count": 500000,
                    "homepage_url": "https://www.harvard.edu",
                }
            ]
        raise AssertionError(f"unexpected query {query!r}")

    monkeypatch.setattr(openalex, "search_institutions", MagicMock(side_effect=fake_search))

    result = resolve_institutions.resolve_school("Harvard Business School")

    assert result["id"] == "I136199984"
    assert result["query_used"] == 'search:"Harvard"'


def test_resolve_school_returns_no_match_when_nothing_found(monkeypatch):
    monkeypatch.setattr(openalex, "search_institutions_by_phrase", MagicMock(return_value=[]))
    monkeypatch.setattr(openalex, "search_institutions", MagicMock(return_value=[]))

    result = resolve_institutions.resolve_school("Nonexistent University Xyzzy")

    assert result["id"] == ""
    assert result["query_used"] == "no match"


def test_generate_report_writes_csv_for_unresolved_schools(monkeypatch, tmp_path):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [
            {"id": "school-1", "slug": "harvard-hbs", "name": "Harvard Business School", "openalex_institution_id": None},
            {"id": "school-2", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I79576946"},
        ],
    )

    monkeypatch.setattr(
        resolve_institutions,
        "resolve_school",
        MagicMock(
            return_value={
                "id": "I136199984",
                "display_name": "Harvard University",
                "works_count": 500000,
                "homepage_url": "https://www.harvard.edu",
                "query_used": 'search:"Harvard"',
            }
        ),
    )

    report_path = tmp_path / "report.csv"
    count = resolve_institutions.generate_report(client, report_path)

    assert count == 1
    rows = list(csv.DictReader(report_path.open()))
    assert len(rows) == 1
    assert rows[0]["slug"] == "harvard-hbs"
    assert rows[0]["openalex_institution_id"] == "I136199984"
    assert rows[0]["query_used"] == 'search:"Harvard"'


def test_apply_report_updates_school_institution_ids(tmp_path):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "harvard-hbs", "name": "Harvard Business School", "openalex_institution_id": None}],
    )

    report_path = tmp_path / "report.csv"
    with report_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=resolve_institutions.REPORT_FIELDS)
        writer.writeheader()
        writer.writerow(
            {
                "slug": "harvard-hbs",
                "school_name": "Harvard Business School",
                "openalex_institution_id": "I136199984",
                "display_name": "Harvard University",
                "works_count": "500000",
                "homepage_url": "https://www.harvard.edu",
                "query_used": 'search:"Harvard"',
            }
        )
        writer.writerow(
            {
                "slug": "some-school",
                "school_name": "Some School",
                "openalex_institution_id": "",
                "display_name": "",
                "works_count": "",
                "homepage_url": "",
                "query_used": "no match",
            }
        )

    updated = resolve_institutions.apply_report(client, report_path)

    assert updated == 1
    school = client.tables["schools"].rows[0]
    assert school["openalex_institution_id"] == "I136199984"


def test_reset_ambiguous_clears_flag_only_for_unmatched_ambiguous_faculty():
    client = FakeSupabaseClient()
    client.seed(
        "faculty",
        [
            {"id": "fac-1", "name": "A", "openalex_author_id": None, "openalex_match_confidence": "ambiguous", "needs_review": True},
            {"id": "fac-2", "name": "B", "openalex_author_id": "A2", "openalex_match_confidence": "ambiguous", "needs_review": True},
            {"id": "fac-3", "name": "C", "openalex_author_id": None, "openalex_match_confidence": None, "needs_review": True},
        ],
    )

    updated = resolve_institutions.reset_ambiguous(client)

    assert updated == 1
    rows = {row["id"]: row for row in client.tables["faculty"].rows}
    assert rows["fac-1"]["openalex_match_confidence"] is None
    assert rows["fac-1"]["needs_review"] is False
    assert rows["fac-2"]["openalex_match_confidence"] == "ambiguous"
    assert rows["fac-3"]["needs_review"] is True
```

This test file accesses `client.tables["schools"].rows` and `client.tables["faculty"].rows` directly — check `tests/fake_supabase.py` for the exact attribute names (`tables` dict keyed by table name, each value having a `.rows` list) before relying on them; adjust to match if the real names differ (e.g. it might be `client._tables` or store rows differently). Read `tests/fake_supabase.py` in full as part of Step 1 verification below.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_resolve_institutions.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.resolve_institutions'`

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/resolve_institutions.py`:

```python
import csv
import os
from pathlib import Path

from scraper import openalex

DEFAULT_REPORT_PATH = Path("output/institution_resolution_report.csv")

REPORT_FIELDS = [
    "slug",
    "school_name",
    "openalex_institution_id",
    "display_name",
    "works_count",
    "homepage_url",
    "query_used",
]


def suffix_candidates(name: str) -> list[str]:
    words = name.split()
    return [" ".join(words[:i]) for i in range(len(words) - 1, 0, -1)]


def resolve_school(school_name: str) -> dict:
    results = openalex.search_institutions_by_phrase(school_name, per_page=1)
    if results:
        return {**results[0], "query_used": f'phrase:"{school_name}"'}

    for candidate in suffix_candidates(school_name):
        results = openalex.search_institutions(candidate, per_page=1)
        if results:
            return {**results[0], "query_used": f'search:"{candidate}"'}

    return {"id": "", "display_name": "", "works_count": "", "homepage_url": "", "query_used": "no match"}


def generate_report(supabase, report_path: Path = DEFAULT_REPORT_PATH) -> int:
    schools = supabase.table("schools").select("id, slug, name, openalex_institution_id").execute().data
    targets = [school for school in schools if not school.get("openalex_institution_id")]

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=REPORT_FIELDS)
        writer.writeheader()
        for school in targets:
            resolution = resolve_school(school["name"])
            writer.writerow(
                {
                    "slug": school["slug"],
                    "school_name": school["name"],
                    "openalex_institution_id": resolution["id"],
                    "display_name": resolution["display_name"],
                    "works_count": resolution["works_count"],
                    "homepage_url": resolution["homepage_url"],
                    "query_used": resolution["query_used"],
                }
            )
    return len(targets)


def apply_report(supabase, report_path: Path = DEFAULT_REPORT_PATH) -> int:
    updated = 0
    with report_path.open(newline="") as f:
        for row in csv.DictReader(f):
            institution_id = row["openalex_institution_id"].strip()
            if not institution_id:
                continue
            supabase.table("schools").update({"openalex_institution_id": institution_id}).eq(
                "slug", row["slug"]
            ).execute()
            updated += 1
    return updated


def reset_ambiguous(supabase) -> int:
    result = (
        supabase.table("faculty")
        .update({"openalex_match_confidence": None, "needs_review": False})
        .eq("openalex_match_confidence", "ambiguous")
        .is_("openalex_author_id", "null")
        .execute()
    )
    return len(result.data)


def main() -> None:
    import argparse

    from supabase import create_client

    parser = argparse.ArgumentParser(description="Resolve schools' OpenAlex institution IDs")
    parser.add_argument("--generate-report", action="store_true", help="Write the resolution report CSV")
    parser.add_argument("--apply", action="store_true", help="Apply a reviewed report CSV to schools")
    parser.add_argument("--reset-ambiguous", action="store_true", help="Reset incorrectly-flagged ambiguous faculty")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="Path to the report CSV")
    args = parser.parse_args()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    report_path = Path(args.report_path)

    if args.generate_report:
        count = generate_report(supabase, report_path)
        print(f"Wrote {count} schools to {report_path}")
    if args.apply:
        count = apply_report(supabase, report_path)
        print(f"Updated openalex_institution_id for {count} schools")
    if args.reset_ambiguous:
        count = reset_ambiguous(supabase)
        print(f"Reset {count} faculty from 'ambiguous' for re-matching")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest tests/test_resolve_institutions.py -v`
Expected: PASS (all 7 tests)

If `client.tables["schools"].rows` / `client.tables["faculty"].rows` don't match the actual `FakeSupabaseClient`/`FakeTable` attribute names from `tests/fake_supabase.py`, fix the test assertions (not the implementation) to use the correct accessors — the implementation only interacts with the public `supabase.table(...)` chainable interface.

- [ ] **Step 5: Run the full test suite**

Run: `cd scraper && PYTHONPATH=. .venv/bin/python -m pytest -q`
Expected: PASS (71 tests — 64 from Task 3 + 7 new)

- [ ] **Step 6: Commit**

```bash
cd scraper && git add scraper/scraper/resolve_institutions.py tests/test_resolve_institutions.py
git commit -m "Add resolve_institutions script for institution-ID resolution heuristic"
```

---

## Task 5: Run the data fixes against production (operational, human-reviewed)

**This task is operational, not TDD** — it runs the scripts built in Tasks 1-4 against the production Supabase database. Each production write requires explicit user confirmation before execution, per established project norms. Do not delegate this task to a subagent — it requires interactive human review of `output/institution_resolution_report.csv` and direct coordination with the user.

**Files:** none (no code changes — uses `scraper/scraper/resolve_institutions.py` and `scraper/scraper/enrich_publications.py` from Tasks 1-4)

- [ ] **Step 1: Generate the institution resolution report**

Confirm with the user this is a read-only step (it only reads `schools` and calls the public OpenAlex API — no writes), then run:

```bash
cd scraper && PYTHONPATH=. .venv/bin/python -m scraper.resolve_institutions --generate-report
```

This writes `output/institution_resolution_report.csv` (gitignored). Expect ~95 rows (schools currently missing `openalex_institution_id`).

- [ ] **Step 2: Human review of the report**

Read `output/institution_resolution_report.csv` (e.g. with the Read tool) and walk through it with the user: for each row, sanity-check `display_name`/`homepage_url`/`works_count` against the school's real-world parent university. Edit the CSV directly for corrections — fix `openalex_institution_id`/`display_name` for wrong matches, or blank `openalex_institution_id` for rows with `query_used == "no match"` or rows where no candidate is a good match (leaving them `null`, handled by the existing runtime fallback in `enrich_faculty`).

Do not proceed to Step 3 until the user has confirmed the reviewed CSV is ready to apply.

- [ ] **Step 3: Apply the reviewed mapping to `schools.openalex_institution_id`**

Ask the user to confirm this production write, then run:

```bash
cd scraper && PYTHONPATH=. .venv/bin/python -m scraper.resolve_institutions --apply
```

- [ ] **Step 4: Reset the 1005 incorrectly-flagged ambiguous faculty**

Ask the user to confirm this production write, then run:

```bash
cd scraper && PYTHONPATH=. .venv/bin/python -m scraper.resolve_institutions --reset-ambiguous
```

Expect the printed count to be close to 1005.

- [ ] **Step 5: Re-run full enrichment in the background**

Ask the user to confirm this production write (it will call `openalex.find_author`/`fetch_works` and write `faculty.openalex_author_id`/`openalex_match_confidence` and `publications` rows for all 1859 faculty), then launch via the Bash tool with `run_in_background: true` (not `nohup ... &`, which was previously observed to be silently killed across tool-call boundaries):

```bash
cd scraper && PYTHONPATH=. .venv/bin/python -m scraper.enrich_publications
```

- [ ] **Step 6: Verify results**

Once the background run completes, query the `faculty` table to report the new distribution of `openalex_match_confidence` values (counts of `name_institution`, `ambiguous`, and `null`/unset), and compare the `name_institution` count against the prior baseline of 84.

---

## Self-Review Notes

- **Spec coverage:** Part 1 (institution resolution heuristic + report + apply) → Task 4 + Task 5 Steps 1-3. Part 2 (pagination fix) → Task 3. Part 3 (reset ambiguous) → Task 5 Step 4 (ordered after Task 5 Step 3, matching the spec's "must run after Part 1" requirement). Part 4 (re-run enrichment) → Task 5 Step 5. Testing section → Tasks 3 and 4's test files. Out-of-scope items are not addressed by any task, as intended.
- **Placeholder scan:** All code blocks are complete, runnable code. No "TBD"/"add error handling"/etc.
- **Type consistency:** `resolve_school` returns a dict with keys `id`, `display_name`, `works_count`, `homepage_url`, `query_used` — used consistently in `generate_report` (Task 4) and in the Task 4 tests. `REPORT_FIELDS` matches the columns written by `generate_report` and read by `apply_report`. `PAGE_SIZE` (Task 3) is referenced consistently in `run()` and the pagination test via monkeypatch. `search_institutions_by_phrase`/`search_institutions` (Task 1) both return `list[dict]` with the same `_institution_summary` shape, consumed identically by `resolve_school` (Task 4).
