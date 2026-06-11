# Generic School Scraper Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Tasks 6 and 7 involve live web research and real LLM API calls (cost + time) — execute these inline in the main session, not via a fresh subagent.**

**Goal:** Build a school-agnostic, LLM-driven scraper path (no per-school parser code) and pilot it on 8 schools to validate the approach for scaling to the UTD Top 100.

**Architecture:** A new `generic.py` module fetches a directory/profile page, strips it to clean markdown text via `trafilatura`, and feeds that text to two LLM calls — a new `extract_faculty_list` (directory page → roster) and the existing `extract_faculty_fields` (profile page → structured fields). `pipeline.py` dispatches to `generic.py` for any school not in `SCRAPER_MODULES`. The 3 existing custom parsers are untouched.

**Tech Stack:** Python, `trafilatura` (new dependency) for HTML-to-text, existing `requests`/`playwright` fetchers, existing OpenAI-compatible LLM client.

---

### Task 1: Add `trafilatura` dependency and `area_hint` config field

**Files:**
- Modify: `scraper/requirements.txt`
- Modify: `scraper/scraper/types.py`

- [ ] **Step 1: Add the dependency**

Add this line to `scraper/requirements.txt` (after `pyyaml==6.0.2`):

```
trafilatura==2.1.0
```

Install it:

```bash
cd scraper && .venv/bin/pip install -r requirements.txt
```

- [ ] **Step 2: Add `area_hint` to `SchoolConfig`**

In `scraper/scraper/types.py`, update the `SchoolConfig` dataclass:

```python
@dataclass
class SchoolConfig:
    slug: str
    name: str
    directory_url: str
    fetch_mode: str
    area_hint: str | None = None
```

(Existing `schools.yaml` entries for wharton/chicago-booth/ucla-anderson have no `area_hint` key — `SchoolConfig(**entry)` in `scraper/scraper/config.py` will use the default `None` for them, no other changes needed.)

- [ ] **Step 3: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/requirements.txt scraper/scraper/types.py && git commit -m "feat(scraper): add trafilatura dependency and area_hint config field"
```

---

### Task 2: HTML-to-text cleaning (`clean_html_to_text`)

**Files:**
- Create: `scraper/scraper/generic.py`
- Create: `scraper/tests/fixtures/generic/sample_directory.html`
- Create: `scraper/tests/test_generic.py`

- [ ] **Step 1: Create the fixture HTML**

Create `scraper/tests/fixtures/generic/sample_directory.html`:

```html
<html>
<head><title>Faculty Directory</title></head>
<body>
<nav><ul><li><a href="/">Home</a></li><li><a href="/about">About</a></li><li><a href="/contact">Contact</a></li></ul></nav>
<main>
<h1>Strategy Faculty</h1>
<p><a href="/faculty/jane-doe">Jane Doe</a> - Associate Professor of Strategic Management. Research interests include innovation and corporate strategy in technology firms across many industries and regions.</p>
<p><a href="/faculty/john-smith">John Smith</a> - Assistant Professor of Strategy. Research interests include entrepreneurship and venture capital financing decisions made by founders and investors.</p>
</main>
<footer>Copyright 2026 Example University. All rights reserved. Privacy Policy.</footer>
</body>
</html>
```

- [ ] **Step 2: Write the failing test**

Create `scraper/tests/test_generic.py`:

```python
from pathlib import Path

from scraper.generic import clean_html_to_text

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "generic"


def test_clean_html_to_text_keeps_main_content_and_links():
    html = (FIXTURES_DIR / "sample_directory.html").read_text()

    text = clean_html_to_text(html)

    assert "[Jane Doe](/faculty/jane-doe)" in text
    assert "[John Smith](/faculty/john-smith)" in text


def test_clean_html_to_text_drops_nav_and_footer():
    html = (FIXTURES_DIR / "sample_directory.html").read_text()

    text = clean_html_to_text(html)

    assert "Copyright" not in text
    assert "Privacy Policy" not in text
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_generic.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.generic'`

- [ ] **Step 4: Implement `clean_html_to_text`**

Create `scraper/scraper/generic.py`:

```python
import trafilatura


def clean_html_to_text(html: str) -> str:
    """Strip boilerplate (nav, footer, ads) and return clean markdown text, preserving links."""
    return trafilatura.extract(html, include_links=True, output_format="markdown") or ""
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd scraper && .venv/bin/pytest tests/test_generic.py -v`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/scraper/generic.py scraper/tests/test_generic.py scraper/tests/fixtures/generic/sample_directory.html && git commit -m "feat(scraper): add HTML-to-text cleaning via trafilatura"
```

---

### Task 3: `extract_faculty_list` LLM call

**Files:**
- Modify: `scraper/scraper/extract.py`
- Modify: `scraper/tests/test_extract.py`

This adds a new LLM extraction function that reads a cleaned directory-page text and
returns the roster for a given faculty area — mirroring the existing
`extract_faculty_fields` retry/error pattern.

- [ ] **Step 1: Write the failing tests**

Add to `scraper/tests/test_extract.py` (alongside the existing imports, add `FacultyStub`
and `extract_faculty_list`):

```python
from scraper.extract import ExtractionError, extract_faculty_fields, extract_faculty_list
from scraper.types import ExtractedFields, FacultyStub
```

Then add these tests at the end of the file:

```python
def test_extract_faculty_list_parses_response_and_resolves_urls():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "faculty": [
                {"name": "Jane Doe", "title": "Associate Professor", "profile_url": "/faculty/jane-doe"},
                {"name": "John Smith", "title": "Assistant Professor", "profile_url": "/faculty/john-smith"},
            ]
        }
    )

    result = extract_faculty_list(
        "Strategy Faculty\n[Jane Doe](/faculty/jane-doe)\n[John Smith](/faculty/john-smith)",
        "Strategy and Strategic Management faculty",
        "https://example.edu/faculty",
        client,
        "test-model",
    )

    assert result == [
        FacultyStub(name="Jane Doe", title="Associate Professor", profile_url="https://example.edu/faculty/jane-doe"),
        FacultyStub(name="John Smith", title="Assistant Professor", profile_url="https://example.edu/faculty/john-smith"),
    ]


def test_extract_faculty_list_skips_entries_without_name():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "faculty": [
                {"name": "Jane Doe", "title": None, "profile_url": "/faculty/jane-doe"},
                {"name": "", "title": "Visiting Scholar", "profile_url": "/faculty/unknown"},
            ]
        }
    )

    result = extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert len(result) == 1
    assert result[0].name == "Jane Doe"


def test_extract_faculty_list_falls_back_to_base_url_when_profile_url_missing():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {"faculty": [{"name": "Jane Doe", "title": "Professor", "profile_url": None}]}
    )

    result = extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert result == [FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty")]


def test_extract_faculty_list_raises_after_max_attempts(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("permanent failure")

    with pytest.raises(ExtractionError):
        extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert client.chat.completions.create.call_count == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_extract.py -v -k extract_faculty_list`
Expected: FAIL with `ImportError: cannot import name 'extract_faculty_list'`

- [ ] **Step 3: Implement `extract_faculty_list`**

In `scraper/scraper/extract.py`, add the import and new constant/function. Add this
import near the top (alongside the existing `from scraper.types import ExtractedFields`):

```python
from urllib.parse import urljoin

from scraper.types import ExtractedFields, FacultyStub
```

Add this system prompt constant after `EXTRACTION_SYSTEM_PROMPT`:

```python
FACULTY_LIST_SYSTEM_PROMPT = """You are extracting a list of faculty members from a university department directory page.
Given the page text (in markdown, with links preserved) and a description of which faculty group to include, return a JSON object with exactly this field:
- "faculty": array of objects, each with:
  - "name": string - the faculty member's full name
  - "title": string or null - their academic title (e.g. "Associate Professor of Strategy")
  - "profile_url": string or null - the URL to their individual profile page, if present in the text

Include every faculty member who belongs to the described group. Do not filter by research topic or seniority - include everyone listed in that group, even if their specific research area is unclear.
Respond with ONLY the JSON object, no other text."""
```

Add this function after `extract_faculty_fields`:

```python
def extract_faculty_list(
    page_text: str, area_hint: str, base_url: str, client, model: str
) -> list[FacultyStub]:
    user_message = f"Faculty group to include: {area_hint}\n\nPage text:\n{page_text}"

    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": FACULTY_LIST_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            stubs = []
            for entry in data.get("faculty", []):
                name = entry.get("name")
                if not name:
                    continue
                profile_url = entry.get("profile_url")
                stubs.append(
                    FacultyStub(
                        name=name,
                        title=entry.get("title"),
                        profile_url=urljoin(base_url, profile_url) if profile_url else base_url,
                    )
                )
            return stubs
        except Exception as error:
            last_error = error
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(2**attempt)

    raise ExtractionError(f"LLM faculty list extraction failed after {MAX_ATTEMPTS} attempts: {last_error}")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_extract.py -v`
Expected: PASS (all tests, including the 8 pre-existing ones)

- [ ] **Step 5: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/scraper/extract.py scraper/tests/test_extract.py && git commit -m "feat(scraper): add extract_faculty_list for generic directory parsing"
```

---

### Task 4: Generic `scrape_faculty_list` and `scrape_bio`

**Files:**
- Modify: `scraper/scraper/generic.py`
- Modify: `scraper/tests/test_generic.py`

- [ ] **Step 1: Write the failing tests**

Add to `scraper/tests/test_generic.py`:

```python
from unittest.mock import MagicMock

from bs4 import BeautifulSoup

from scraper.generic import clean_html_to_text, scrape_bio, scrape_faculty_list
from scraper.types import FacultyStub, SchoolConfig
```

(Replace the existing `from scraper.generic import clean_html_to_text` import line with
the combined import above.)

Then add:

```python
def _config(fetch_mode="static"):
    return SchoolConfig(
        slug="example",
        name="Example University",
        directory_url="https://example.edu/faculty",
        fetch_mode=fetch_mode,
        area_hint="Strategy and Strategic Management faculty",
    )


def test_scrape_faculty_list_fetches_cleans_and_extracts(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_static = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_static", fetch_static)

    expected = [FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty/jane-doe")]
    extract_faculty_list = MagicMock(return_value=expected)
    monkeypatch.setattr("scraper.generic.extract_faculty_list", extract_faculty_list)

    client = MagicMock()
    config = _config()

    result = scrape_faculty_list(config, client, "test-model")

    assert result == expected
    fetch_static.assert_called_once_with(config.directory_url)

    call_args = extract_faculty_list.call_args[0]
    cleaned_text, area_hint, base_url, passed_client, passed_model = call_args
    assert "[Jane Doe](/faculty/jane-doe)" in cleaned_text
    assert area_hint == "Strategy and Strategic Management faculty"
    assert base_url == config.directory_url
    assert passed_client is client
    assert passed_model == "test-model"


def test_scrape_faculty_list_uses_rendered_fetch_when_configured(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_rendered = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_rendered", fetch_rendered)
    monkeypatch.setattr("scraper.generic.extract_faculty_list", MagicMock(return_value=[]))

    config = _config(fetch_mode="rendered")

    scrape_faculty_list(config, MagicMock(), "test-model")

    fetch_rendered.assert_called_once_with(config.directory_url)


def test_scrape_bio_fetches_and_cleans(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_static = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_static", fetch_static)

    config = _config()
    stub = FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty/jane-doe")

    bio_text = scrape_bio(config, stub)

    fetch_static.assert_called_once_with(stub.profile_url)
    assert "[Jane Doe](/faculty/jane-doe)" in bio_text
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_generic.py -v`
Expected: FAIL with `ImportError: cannot import name 'scrape_faculty_list'`

- [ ] **Step 3: Implement `scrape_faculty_list` and `scrape_bio`**

Replace the contents of `scraper/scraper/generic.py` with:

```python
import trafilatura

from scraper.extract import extract_faculty_list
from scraper.fetch import fetch_rendered, fetch_static
from scraper.types import FacultyStub, SchoolConfig


def clean_html_to_text(html: str) -> str:
    """Strip boilerplate (nav, footer, ads) and return clean markdown text, preserving links."""
    return trafilatura.extract(html, include_links=True, output_format="markdown") or ""


def _fetch_html(url: str, fetch_mode: str) -> str:
    soup = fetch_rendered(url) if fetch_mode == "rendered" else fetch_static(url)
    return str(soup)


def scrape_faculty_list(config: SchoolConfig, client, model: str) -> list[FacultyStub]:
    html = _fetch_html(config.directory_url, config.fetch_mode)
    text = clean_html_to_text(html)
    return extract_faculty_list(text, config.area_hint or "", config.directory_url, client, model)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    html = _fetch_html(stub.profile_url, config.fetch_mode)
    return clean_html_to_text(html)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_generic.py -v`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/scraper/generic.py scraper/tests/test_generic.py && git commit -m "feat(scraper): add generic scrape_faculty_list and scrape_bio"
```

---

### Task 5: Pipeline dispatch + `--school` CLI filter

**Files:**
- Modify: `scraper/scraper/pipeline.py`
- Modify: `scraper/tests/test_pipeline.py` (create if it doesn't exist)

- [ ] **Step 1: Check for an existing pipeline test file**

```bash
cd scraper && ls tests/test_pipeline.py 2>/dev/null || echo "no existing test file"
```

If it exists, read it first and add the new test alongside the existing ones using the
same fixture/mocking conventions. If not, create it fresh as shown below.

- [ ] **Step 2: Write the failing test**

Create (or add to) `scraper/tests/test_pipeline.py`:

```python
from unittest.mock import MagicMock

from scraper import generic
from scraper.pipeline import scrape_school
from scraper.types import ExtractedFields, FacultyStub, SchoolConfig


def test_scrape_school_uses_generic_module_for_unregistered_slug(monkeypatch):
    config = SchoolConfig(
        slug="example",
        name="Example University",
        directory_url="https://example.edu/faculty",
        fetch_mode="static",
        area_hint="Strategy faculty",
    )

    stub = FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty/jane-doe")
    monkeypatch.setattr(generic, "scrape_faculty_list", MagicMock(return_value=[stub]))
    monkeypatch.setattr(generic, "scrape_bio", MagicMock(return_value="A long enough bio about strategy research."))

    monkeypatch.setattr(
        "scraper.pipeline.extract_faculty_fields",
        MagicMock(
            return_value=ExtractedFields(
                phd_institution="MIT",
                methodology="Qualitative",
                topics=["Strategy"],
                theories=[],
                personal_website_url=None,
                google_scholar_url=None,
            )
        ),
    )

    records = scrape_school(config, MagicMock(), "test-model")

    assert len(records) == 1
    assert records[0]["name"] == "Jane Doe"
    assert records[0]["phd_institution"] == "MIT"
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_pipeline.py -v`
Expected: FAIL — either `KeyError: 'example'` (current code does
`SCRAPER_MODULES[config.slug]` unconditionally) or an `AttributeError`/`AssertionError`.

- [ ] **Step 4: Update `scrape_school` dispatch and add `--school` CLI option**

Replace the contents of `scraper/scraper/pipeline.py` with:

```python
import argparse
import hashlib
import json
import os
from pathlib import Path

from scraper import generic
from scraper.config import load_school_configs
from scraper.extract import build_client, extract_faculty_fields, get_model
from scraper.schools import chicago_booth, ucla_anderson, wharton
from scraper.types import SchoolConfig

SCRAPER_MODULES = {
    "wharton": wharton,
    "chicago-booth": chicago_booth,
    "ucla-anderson": ucla_anderson,
}


def _bio_hash(bio_text: str) -> str:
    return "sha256:" + hashlib.sha256(bio_text.encode("utf-8")).hexdigest()


def scrape_school(config: SchoolConfig, client, model: str, limit: int | None = None) -> list[dict]:
    if config.slug in SCRAPER_MODULES:
        module = SCRAPER_MODULES[config.slug]
        stubs = module.scrape_faculty_list(config)
        bio_fn = module.scrape_bio
    else:
        stubs = generic.scrape_faculty_list(config, client, model)
        bio_fn = generic.scrape_bio

    if limit is not None:
        stubs = stubs[:limit]

    records = []
    for stub in stubs:
        bio_text = bio_fn(config, stub)
        extracted = extract_faculty_fields(stub.name, stub.title, bio_text, client, model)
        records.append(
            {
                "name": stub.name,
                "title": stub.title,
                "school_profile_url": stub.profile_url,
                "personal_website_url": extracted.personal_website_url,
                "google_scholar_url": extracted.google_scholar_url,
                "phd_institution": extracted.phd_institution,
                "methodology": extracted.methodology,
                "topics": extracted.topics,
                "theories": extracted.theories,
                "bio_hash": _bio_hash(bio_text),
            }
        )
    return records


def run_pipeline(
    config_path: Path, output_dir: Path, school_slug: str | None = None, limit: int | None = None
) -> None:
    configs = load_school_configs(config_path)
    if school_slug:
        configs = [c for c in configs if c.slug == school_slug]

    client = build_client()
    model = get_model()

    output_dir.mkdir(parents=True, exist_ok=True)
    for config in configs:
        records = scrape_school(config, client, model, limit=limit)
        output_path = output_dir / f"{config.slug}.json"
        output_path.write_text(json.dumps(records, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape faculty bios for configured schools")
    parser.add_argument("--school", help="Only scrape this school slug")
    parser.add_argument("--limit", type=int, help="Only process this many faculty per school")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    limit_env = os.environ.get("SCRAPE_LIMIT")
    run_pipeline(
        config_path=repo_root / "config" / "schools.yaml",
        output_dir=repo_root / "output",
        school_slug=args.school,
        limit=args.limit if args.limit is not None else (int(limit_env) if limit_env else None),
    )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest -v`
Expected: PASS (all tests, including pre-existing school-specific tests)

- [ ] **Step 6: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/scraper/pipeline.py scraper/tests/test_pipeline.py && git commit -m "feat(scraper): dispatch to generic scraper for unregistered schools, add --school CLI filter"
```

---

### Task 6: Research and configure 8 pilot schools

**Files:**
- Modify: `scraper/config/schools.yaml`

This task is research-driven (no mocked unit test) — you'll use WebFetch/WebSearch to
find each school's current Strategy-area faculty directory page.

- [ ] **Step 1: For each of the 8 schools below, find the faculty directory page**

Pilot schools: MIT Sloan, Stanford GSB, Harvard Business School, Columbia Business
School, NYU Stern, Northwestern Kellogg, UC Berkeley Haas, Michigan Ross.

For each school:

1. Web-search for `"<school name> strategy faculty directory"` to find the current URL
   of the page listing Strategy (or Strategic Management / Strategy & Entrepreneurship,
   etc. — whatever that school calls it) faculty.
2. WebFetch the candidate URL and confirm it lists multiple named faculty with profile
   links — if the fetched content looks empty or JS-placeholder-only (e.g. "Loading...",
   no faculty names in the text), the page is likely JS-rendered; note `fetch_mode:
   rendered` for that school.
3. Write a one-sentence `area_hint` describing how that school's directory page labels
   the Strategy group (e.g. `"Strategy and Innovation faculty group"`, `"Strategy
   Unit"`, `"Management and Organizations - Strategy area"`) — base this on the heading
   or grouping text you see on the page itself.

- [ ] **Step 2: Add entries to `scraper/config/schools.yaml`**

For each school, append an entry following this shape (using the real URL, slug, and
`area_hint` discovered in Step 1):

```yaml
- slug: mit-sloan
  name: "MIT Sloan"
  directory_url: "<discovered directory URL>"
  fetch_mode: static  # or "rendered" if Step 1 found it's JS-rendered
  area_hint: "<one-sentence description from Step 1>"
```

Use slugs: `mit-sloan`, `stanford-gsb`, `harvard-hbs`, `columbia-cbs`, `nyu-stern`,
`northwestern-kellogg`, `berkeley-haas`, `michigan-ross`.

- [ ] **Step 3: Commit**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add scraper/config/schools.yaml && git commit -m "config(scraper): add 8 pilot schools for generic scraper"
```

---

### Task 7: Run the pilot and write up evaluation

**Files:**
- Create: `scraper/output/<slug>.json` for each pilot school (gitignored — verify with
  `git check-ignore scraper/output/mit-sloan.json`; if not ignored, do not commit these,
  they're for manual review only)
- Create: `docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md`

- [ ] **Step 1: Smoke-test each school with `--limit 2`**

For each of the 8 slugs from Task 6, run:

```bash
cd scraper && set -a && source .env && set +a && .venv/bin/python -m scraper.pipeline --school mit-sloan --limit 2
```

Inspect `output/mit-sloan.json`. Check:
- Did `scrape_faculty_list` return any faculty at all? (empty list → directory page
  extraction failed for this school — note it as a failure mode, move to the next
  school rather than debugging deeply now)
- For the 2 faculty processed, are `phd_institution`/`topics`/`methodology` populated
  (not all null)? Null values for *some* fields are fine; all-null across both faculty
  suggests the bio page text wasn't extracted properly.

- [ ] **Step 2: Full-run schools that passed the smoke test**

For each school where Step 1 looked reasonable, run without `--limit`:

```bash
cd scraper && set -a && source .env && set +a && .venv/bin/python -m scraper.pipeline --school mit-sloan
```

- [ ] **Step 3: Write the evaluation report**

Create `docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md` with one
section per school:

```markdown
# Generic Scraper Pilot — Results

## <School Name> (`<slug>`)

- Faculty found: <N>
- Roster looks correct: yes/no — <brief note, e.g. "includes 2 Entrepreneurship-only
  faculty, but per design this is expected — manual cleanup via needs_review">
- Bio field quality: <e.g. "phd_institution populated for 8/10, topics for 10/10">
- Issues: <e.g. "none" / "directory page is paginated, only first page captured">

(repeat for each of the 8 schools)

## Summary

- Schools fully working: <N>/8
- Schools with directory-extraction failures: <list + brief cause>
- Rough LLM call count: 1 per school (directory) + 1 per faculty (bio) = <total>
- Recommendation: <proceed to remaining ~90 schools with this approach / needs tweaks
  first — describe what>
```

Fill in actual findings from Steps 1-2.

- [ ] **Step 4: Commit the evaluation report**

```bash
cd "/Users/haoyi/Documents/PlaylistHY/Apply for Strategy" && git add docs/superpowers/specs/2026-06-11-generic-scraper-pilot-results.md && git commit -m "docs(scraper): record generic scraper pilot results"
```

---

## Self-Review Notes

- **Spec coverage**: Task 1 covers the `area_hint` schema addition and dependency; Task
  2-4 cover the generic extraction module (`clean_html_to_text`, `extract_faculty_list`,
  `scrape_faculty_list`/`scrape_bio`); Task 5 covers pipeline dispatch; Task 6 covers
  pilot school selection/config; Task 7 covers the pilot run and evaluation writeup.
  Out-of-scope items (rewriting existing parsers, scaling to 90 schools, pagination
  handling, live Supabase upsert, OpenAlex enrichment changes) are correctly left
  untouched.
- **No live Supabase writes**: Task 7 only writes to `output/*.json` (gitignored,
  per-school review) — no `schools` table inserts, matching the spec's "manual review
  first" scoping.
- **Type consistency**: `extract_faculty_list` returns `list[FacultyStub]` (Task 3),
  consumed identically by `generic.scrape_faculty_list` (Task 4) and `pipeline.scrape_school`
  (Task 5) — same as the existing `SCRAPER_MODULES[...].scrape_faculty_list` return type.
