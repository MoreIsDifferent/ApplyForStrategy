# Publication Enrichment (OpenAlex) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the empty `publications` table with each faculty member's most-recent and most-cited papers from OpenAlex, with author matching (cached on `faculty`) and a `needs_review` queue for ambiguous matches.

**Architecture:** A new `scraper/scraper/openalex.py` module wraps the OpenAlex HTTP API (institution lookup, author matching, work fetching/dedup/abstract reconstruction). A new standalone script `scraper/scraper/enrich_publications.py` (same pattern as `categorize_topics.py`) iterates over `faculty` rows, matches each to an OpenAlex author, and upserts their publications. A new migration adds the supporting columns.

**Tech Stack:** Python, `requests` (already a dependency), Supabase Python client, pytest with `unittest.mock` and the existing `tests/fake_supabase.py` fake client.

---

### Task 1: Database migration for OpenAlex columns

**Files:**
- Create: `supabase/migrations/0003_publication_enrichment.sql`
- Modify: `supabase/setup_combined.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/0003_publication_enrichment.sql

-- publications: support OpenAlex-sourced data and dedup across recent/most-cited lists
alter table publications add column abstract text;
alter table publications add column openalex_id text;
alter table publications add constraint publications_faculty_openalex_unique
  unique (faculty_id, openalex_id);

-- faculty: cache OpenAlex author match
alter table faculty add column openalex_author_id text;
alter table faculty add column openalex_match_confidence text
  check (openalex_match_confidence in ('name_institution', 'ambiguous'));

-- schools: cache OpenAlex institution ID (resolved lazily on first enrichment run)
alter table schools add column openalex_institution_id text;
```

- [ ] **Step 2: Update the combined fresh-install script to match**

In `supabase/setup_combined.sql`, update the header comment and the three affected
`create table` statements so a fresh install includes the same columns/constraints.

Change the header comment (currently line 2) to:

```sql
-- Includes schema.sql + migrations/0001_add_bio_hash.sql + migrations/0002_add_topic_taxonomy.sql + migrations/0003_publication_enrichment.sql + school records (no placeholder faculty).
```

Change the `schools` table to add `openalex_institution_id text` after `logo_url text`:

```sql
create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  geography text,
  ranking_utd integer,
  ranking_tamuga integer,
  ranking_qs integer,
  ranking_usnews integer,
  placement_summary text,
  website_url text,
  logo_url text,
  openalex_institution_id text
);
```

Change the `faculty` table to add the two new columns after `bio_hash text`:

```sql
create table faculty (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  school_id uuid not null references schools(id) on delete cascade,
  title text,
  phd_institution text,
  photo_url text,
  school_profile_url text,
  personal_website_url text,
  google_scholar_url text,
  methodology text,
  needs_review boolean not null default false,
  bio_hash text,
  openalex_author_id text,
  openalex_match_confidence text check (openalex_match_confidence in ('name_institution', 'ambiguous'))
);
```

Change the `publications` table to add `abstract`, `openalex_id`, and the unique constraint:

```sql
create table publications (
  id uuid primary key default uuid_generate_v4(),
  faculty_id uuid not null references faculty(id) on delete cascade,
  title text not null,
  year integer,
  journal text,
  citation_count integer,
  coauthors text[],
  abstract text,
  openalex_id text,
  unique (faculty_id, openalex_id)
);
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_publication_enrichment.sql supabase/setup_combined.sql
git commit -m "feat(db): add OpenAlex matching and publication enrichment columns"
```

**Note for the user:** This migration must be applied to the live Supabase
project by running `supabase/migrations/0003_publication_enrichment.sql` in
the Supabase SQL Editor (the existing `faculty`/`publications`/`schools` tables
already have data, so this is an `alter table`, not a fresh install via
`setup_combined.sql`).

---

### Task 2: OpenAlex client — institution and author matching

**Files:**
- Create: `scraper/scraper/openalex.py`
- Test: `scraper/tests/test_openalex.py`

- [ ] **Step 1: Write the failing tests**

```python
# scraper/tests/test_openalex.py
from unittest.mock import MagicMock

from scraper import openalex


def _response(json_data):
    response = MagicMock()
    response.json.return_value = json_data
    response.raise_for_status.return_value = None
    return response


def test_resolve_institution_id_returns_short_id(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {"results": [{"id": "https://openalex.org/I79576946", "display_name": "University of Pennsylvania"}]}
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    result = openalex.resolve_institution_id("Wharton (UPenn)")

    assert result == "I79576946"
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["filter"] == "display_name.search:Wharton (UPenn)"


def test_resolve_institution_id_returns_none_when_no_results(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    assert openalex.resolve_institution_id("Nonexistent University") is None


def test_find_author_returns_match_when_single_candidate(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {"results": [{"id": "https://openalex.org/A5081922410", "display_name": "Michael E. Porter"}]}
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Michael Porter", "I136199984")

    assert author_id == "A5081922410"
    assert confidence == "name_institution"


def test_find_author_ambiguous_when_multiple_candidates(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {"id": "https://openalex.org/A1", "display_name": "Jane Doe"},
                    {"id": "https://openalex.org/A2", "display_name": "Jane Doe"},
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", "I79576946")

    assert author_id is None
    assert confidence == "ambiguous"


def test_find_author_ambiguous_when_zero_candidates(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", "I79576946")

    assert author_id is None
    assert confidence == "ambiguous"


def test_find_author_ambiguous_when_no_institution_id(monkeypatch):
    mock_get = MagicMock()
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", None)

    assert author_id is None
    assert confidence == "ambiguous"
    mock_get.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_openalex.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.openalex'` (or `AttributeError`)

- [ ] **Step 3: Implement `resolve_institution_id` and `find_author`**

```python
# scraper/scraper/openalex.py
import os
from datetime import date

import requests

BASE_URL = "https://api.openalex.org"
USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)

DEFAULT_LIMIT = 10
EXPANDED_LIMIT = 20
WORKS_COUNT_THRESHOLD = 30
RECENT_YEARS = 3
RECENT_WORKS_THRESHOLD = 3


def _get(path: str, params: dict) -> dict:
    params = dict(params)
    params["mailto"] = os.environ.get("OPENALEX_EMAIL", "phd-finder@example.com")
    response = requests.get(
        f"{BASE_URL}{path}", params=params, headers={"User-Agent": USER_AGENT}, timeout=30
    )
    response.raise_for_status()
    return response.json()


def _short_id(openalex_url: str) -> str:
    return openalex_url.rsplit("/", 1)[-1]


def resolve_institution_id(school_name: str) -> str | None:
    data = _get("/institutions", {"filter": f"display_name.search:{school_name}", "per_page": 1})
    results = data.get("results") or []
    if not results:
        return None
    return _short_id(results[0]["id"])


def find_author(name: str, institution_id: str | None) -> tuple[str | None, str]:
    if institution_id is None:
        return None, "ambiguous"

    filter_str = f"display_name.search:{name},affiliations.institution.id:{institution_id}"
    data = _get("/authors", {"filter": filter_str, "per_page": 25})
    results = data.get("results") or []
    if len(results) != 1:
        return None, "ambiguous"
    return _short_id(results[0]["id"]), "name_institution"
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_openalex.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/openalex.py scraper/tests/test_openalex.py
git commit -m "feat(scraper): add OpenAlex institution and author matching"
```

---

### Task 3: OpenAlex client — fetching and deduping works

**Files:**
- Modify: `scraper/scraper/openalex.py`
- Test: `scraper/tests/test_openalex.py`

- [ ] **Step 1: Write the failing tests**

Append to `scraper/tests/test_openalex.py`:

```python
from datetime import date


def _work(openalex_id, title, year, journal, citations, coauthors, abstract_words=None):
    abstract_inverted_index = None
    if abstract_words:
        abstract_inverted_index = {word: [i] for i, word in enumerate(abstract_words)}
    return {
        "id": f"https://openalex.org/{openalex_id}",
        "display_name": title,
        "publication_year": year,
        "cited_by_count": citations,
        "primary_location": {"source": {"display_name": journal}} if journal else None,
        "authorships": [{"author": {"display_name": coauthor}} for coauthor in coauthors],
        "abstract_inverted_index": abstract_inverted_index,
    }


def test_fetch_works_dedupes_and_reconstructs_abstract(monkeypatch):
    shared = _work("W1", "Shared Paper", 2024, "Strategic Management Journal", 50, ["Author A", "Author B"], ["This", "is", "abstract"])
    recent_only = _work("W2", "Recent Paper", 2025, "Org Science", 5, ["Author A"], None)
    cited_only = _work("W3", "Cited Paper", 2010, "AMJ", 500, ["Author A"], None)

    def fake_get(url, params=None, headers=None, timeout=None):
        if "/authors/" in url:
            return _response({"works_count": 10})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 0}})
        if params.get("sort") == "publication_date:desc":
            return _response({"results": [recent_only, shared]})
        if params.get("sort") == "cited_by_count:desc":
            return _response({"results": [cited_only, shared]})
        raise AssertionError(f"unexpected request: {url} {params}")

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    works = openalex.fetch_works("A123", today=date(2026, 1, 1))

    ids = {w["openalex_id"] for w in works}
    assert ids == {"W1", "W2", "W3"}

    shared_result = next(w for w in works if w["openalex_id"] == "W1")
    assert shared_result["title"] == "Shared Paper"
    assert shared_result["year"] == 2024
    assert shared_result["journal"] == "Strategic Management Journal"
    assert shared_result["citation_count"] == 50
    assert shared_result["coauthors"] == ["Author A", "Author B"]
    assert shared_result["abstract"] == "This is abstract"

    cited_only_result = next(w for w in works if w["openalex_id"] == "W3")
    assert cited_only_result["journal"] == "AMJ"
    assert cited_only_result["abstract"] is None


def test_fetch_works_uses_default_limit_for_typical_author(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 10})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 1}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert len(sort_calls) == 2
    assert all(params["per_page"] == 10 for params in sort_calls)


def test_fetch_works_expands_limit_for_prolific_author(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 31})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 0}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert all(params["per_page"] == 20 for params in sort_calls)


def test_fetch_works_expands_limit_for_rising_star(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 5})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 3}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert all(params["per_page"] == 20 for params in sort_calls)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_openalex.py -v -k fetch_works`
Expected: FAIL with `AttributeError: module 'scraper.openalex' has no attribute 'fetch_works'`

- [ ] **Step 3: Implement `fetch_works` and helpers**

Append to `scraper/scraper/openalex.py`:

```python
def fetch_works(author_id: str, today: date | None = None) -> list[dict]:
    today = today or date.today()
    author = _get(f"/authors/{author_id}", {})
    works_count = author.get("works_count", 0)

    cutoff = date(today.year - RECENT_YEARS, today.month, today.day).isoformat()
    recent_count_data = _get(
        "/works",
        {
            "filter": f"authorships.author.id:{author_id},from_publication_date:{cutoff}",
            "per_page": 1,
        },
    )
    recent_count = recent_count_data.get("meta", {}).get("count", 0)

    limit = (
        EXPANDED_LIMIT
        if works_count > WORKS_COUNT_THRESHOLD or recent_count >= RECENT_WORKS_THRESHOLD
        else DEFAULT_LIMIT
    )

    recent = _get(
        "/works",
        {"filter": f"authorships.author.id:{author_id}", "sort": "publication_date:desc", "per_page": limit},
    )
    cited = _get(
        "/works",
        {"filter": f"authorships.author.id:{author_id}", "sort": "cited_by_count:desc", "per_page": limit},
    )

    deduped: dict[str, dict] = {}
    for work in recent.get("results", []) + cited.get("results", []):
        parsed = _parse_work(work)
        deduped.setdefault(parsed["openalex_id"], parsed)
    return list(deduped.values())


def _parse_work(work: dict) -> dict:
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    return {
        "openalex_id": _short_id(work["id"]),
        "title": work.get("display_name"),
        "year": work.get("publication_year"),
        "journal": source.get("display_name"),
        "citation_count": work.get("cited_by_count"),
        "coauthors": [authorship["author"]["display_name"] for authorship in work.get("authorships", [])],
        "abstract": _reconstruct_abstract(work.get("abstract_inverted_index")),
    }


def _reconstruct_abstract(inverted_index: dict | None) -> str | None:
    if not inverted_index:
        return None
    positions: list[tuple[int, str]] = []
    for word, indexes in inverted_index.items():
        for index in indexes:
            positions.append((index, word))
    positions.sort()
    return " ".join(word for _, word in positions)
```

Also update the `test_openalex.py` imports at the top of the file to include `MagicMock`
and the new `_work`/`date` helpers (they're already imported/defined above in this task,
but `MagicMock` and `_response` come from Task 2 — make sure the file has a single
`from unittest.mock import MagicMock` at the top and `from datetime import date` near
the new tests).

- [ ] **Step 4: Run all openalex tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_openalex.py -v`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/openalex.py scraper/tests/test_openalex.py
git commit -m "feat(scraper): fetch and dedupe OpenAlex works with prolific-author expansion"
```

---

### Task 4: Publication enrichment script

**Files:**
- Create: `scraper/scraper/enrich_publications.py`
- Test: `scraper/tests/test_enrich_publications.py`

- [ ] **Step 1: Write the failing tests**

```python
# scraper/tests/test_enrich_publications.py
from unittest.mock import MagicMock

from scraper import enrich_publications, openalex
from tests.fake_supabase import FakeSupabaseClient


def test_skips_faculty_already_matched(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": "A1"}],
    )

    find_author = MagicMock()
    monkeypatch.setattr(openalex, "find_author", find_author)

    enrich_publications.run(client)

    find_author.assert_not_called()


def test_ambiguous_match_sets_needs_review(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None, "needs_review": False}],
    )

    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=(None, "ambiguous")))
    fetch_works = MagicMock()
    monkeypatch.setattr(openalex, "fetch_works", fetch_works)

    enrich_publications.run(client)

    faculty_row = client.tables["faculty"].rows[0]
    assert faculty_row["needs_review"] is True
    assert faculty_row["openalex_match_confidence"] == "ambiguous"
    assert faculty_row.get("openalex_author_id") is None
    fetch_works.assert_not_called()


def test_successful_match_resolves_institution_and_upserts_publications(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": None}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None}],
    )
    client.seed(
        "publications",
        [{"id": "pub-existing", "faculty_id": "fac-1", "openalex_id": "W1", "title": "Old Title", "citation_count": 10}],
    )

    monkeypatch.setattr(openalex, "resolve_institution_id", MagicMock(return_value="I79576946"))
    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=("A1", "name_institution")))
    monkeypatch.setattr(
        openalex,
        "fetch_works",
        MagicMock(
            return_value=[
                {
                    "openalex_id": "W1",
                    "title": "Updated Title",
                    "year": 2024,
                    "journal": "SMJ",
                    "citation_count": 99,
                    "coauthors": ["Jane Doe"],
                    "abstract": "abc",
                },
                {
                    "openalex_id": "W2",
                    "title": "New Paper",
                    "year": 2025,
                    "journal": "AMJ",
                    "citation_count": 1,
                    "coauthors": ["Jane Doe"],
                    "abstract": "def",
                },
            ]
        ),
    )

    enrich_publications.run(client)

    school_row = client.tables["schools"].rows[0]
    assert school_row["openalex_institution_id"] == "I79576946"

    faculty_row = client.tables["faculty"].rows[0]
    assert faculty_row["openalex_author_id"] == "A1"
    assert faculty_row["openalex_match_confidence"] == "name_institution"

    pub_rows = client.tables["publications"].rows
    assert len(pub_rows) == 2

    updated = next(p for p in pub_rows if p["openalex_id"] == "W1")
    assert updated["id"] == "pub-existing"
    assert updated["title"] == "Updated Title"
    assert updated["citation_count"] == 99

    new_pub = next(p for p in pub_rows if p["openalex_id"] == "W2")
    assert new_pub["title"] == "New Paper"


def test_run_filters_by_school_slug(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [
            {"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"},
            {"id": "school-2", "slug": "chicago-booth", "name": "Chicago Booth", "openalex_institution_id": "I2"},
        ],
    )
    client.seed(
        "faculty",
        [
            {"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None, "needs_review": False},
            {"id": "fac-2", "name": "John Roe", "school_id": "school-2", "openalex_author_id": None, "needs_review": False},
        ],
    )

    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=(None, "ambiguous")))
    monkeypatch.setattr(openalex, "fetch_works", MagicMock())

    enrich_publications.run(client, school_slug="wharton")

    faculty_rows = {row["id"]: row for row in client.tables["faculty"].rows}
    assert faculty_rows["fac-1"]["needs_review"] is True
    assert faculty_rows["fac-2"]["needs_review"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_enrich_publications.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.enrich_publications'`

- [ ] **Step 3: Implement the enrichment script**

```python
# scraper/scraper/enrich_publications.py
import os

from scraper import openalex


def upsert_publication(supabase, faculty_id: str, work: dict) -> None:
    existing = (
        supabase.table("publications")
        .select("id")
        .eq("faculty_id", faculty_id)
        .eq("openalex_id", work["openalex_id"])
        .execute()
    )

    fields = {
        "faculty_id": faculty_id,
        "title": work["title"],
        "year": work["year"],
        "journal": work["journal"],
        "citation_count": work["citation_count"],
        "coauthors": work["coauthors"],
        "abstract": work["abstract"],
        "openalex_id": work["openalex_id"],
    }

    if existing.data:
        supabase.table("publications").update(fields).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("publications").insert(fields).execute()


def enrich_faculty(supabase, faculty_row: dict, institution_cache: dict[str, str | None]) -> None:
    school_id = faculty_row["school_id"]

    if school_id not in institution_cache:
        school = (
            supabase.table("schools")
            .select("id, name, openalex_institution_id")
            .eq("id", school_id)
            .execute()
            .data[0]
        )
        institution_id = school.get("openalex_institution_id")
        if not institution_id:
            institution_id = openalex.resolve_institution_id(school["name"])
            if institution_id:
                supabase.table("schools").update({"openalex_institution_id": institution_id}).eq(
                    "id", school_id
                ).execute()
        institution_cache[school_id] = institution_id

    institution_id = institution_cache[school_id]
    author_id, confidence = openalex.find_author(faculty_row["name"], institution_id)

    if author_id is None:
        supabase.table("faculty").update(
            {"openalex_match_confidence": "ambiguous", "needs_review": True}
        ).eq("id", faculty_row["id"]).execute()
        return

    supabase.table("faculty").update(
        {"openalex_author_id": author_id, "openalex_match_confidence": confidence}
    ).eq("id", faculty_row["id"]).execute()

    for work in openalex.fetch_works(author_id):
        upsert_publication(supabase, faculty_row["id"], work)


def run(supabase, school_slug: str | None = None, limit: int | None = None) -> None:
    query = supabase.table("faculty").select("id, name, school_id, openalex_author_id")
    if school_slug:
        school = supabase.table("schools").select("id").eq("slug", school_slug).execute().data[0]
        query = query.eq("school_id", school["id"])

    rows = [row for row in query.execute().data if not row.get("openalex_author_id")]
    if limit is not None:
        rows = rows[:limit]

    institution_cache: dict[str, str | None] = {}
    for row in rows:
        enrich_faculty(supabase, row, institution_cache)


def main() -> None:
    import argparse

    from supabase import create_client

    parser = argparse.ArgumentParser(description="Enrich faculty with OpenAlex publication data")
    parser.add_argument("--school", help="Only process faculty at this school slug")
    parser.add_argument("--limit", type=int, help="Only process this many faculty")
    args = parser.parse_args()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    run(supabase, school_slug=args.school, limit=args.limit)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_enrich_publications.py -v`
Expected: PASS (4 tests)

- [ ] **Step 5: Run the full test suite**

Run: `cd scraper && .venv/bin/pytest -v`
Expected: PASS (all existing tests plus the new ones, no regressions)

- [ ] **Step 6: Commit**

```bash
git add scraper/scraper/enrich_publications.py scraper/tests/test_enrich_publications.py
git commit -m "feat(scraper): add enrich_publications script for OpenAlex publication upserts"
```

---

### Task 5: Documentation and environment config

**Files:**
- Modify: `scraper/.env.example`
- Modify: `scraper/README.md`

- [ ] **Step 1: Add the optional `OPENALEX_EMAIL` variable**

In `scraper/.env.example`, append:

```
OPENALEX_EMAIL=
```

- [ ] **Step 2: Document the new script in the README**

In `scraper/README.md`, add a new section after the "Upserting into Supabase" section
(before "## Testing"):

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add scraper/.env.example scraper/README.md
git commit -m "docs(scraper): document OpenAlex publication enrichment script"
```

---

## Self-Review Notes

- **Spec coverage:** Migration columns (Task 1), institution/author matching with
  confidence levels and `needs_review` (Task 2, Task 4), work fetching with
  dedup/abstract reconstruction/prolific expansion (Task 3), standalone
  CLI script following `categorize_topics.py` pattern (Task 4), manual review
  workflow docs (Task 5). Semantic Scholar/Crossref fallback and topic/theory
  classification are explicitly out of scope per the spec and not included here.
- **Placeholder scan:** No TBD/TODO; all code blocks are complete and runnable.
- **Type consistency:** `fetch_works` returns dicts with keys `openalex_id`,
  `title`, `year`, `journal`, `citation_count`, `coauthors`, `abstract` —
  consistent between Task 3's implementation/tests and Task 4's
  `upsert_publication` and test fixtures.
