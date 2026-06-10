# Strategy PhD Scraping Pipeline Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Python scraping pipeline that scrapes Strategy-area faculty bios from Wharton, Chicago Booth, and UCLA Anderson, extracts structured fields via an LLM, writes JSON output, and provides a Supabase upsert script + GitHub Actions workflow ready for when Supabase is set up.

**Architecture:** A `scraper/` package with a generic `pipeline.py` that loops over schools defined in `config/schools.yaml`, delegating directory/bio scraping to per-school modules (`scraper/scraper/schools/<slug>.py`) that share a common interface, then runs LLM extraction (`extract.py`) and writes `output/<slug>.json`. `upsert.py` reads that JSON and upserts into Supabase with `needs_review` flagging, tested against an in-memory fake client.

**Tech Stack:** Python 3.11+, requests, beautifulsoup4, playwright, openai (OpenAI-compatible client), pyyaml, supabase-py, pytest

---

### Task 1: Project scaffold and core types

**Files:**
- Create: `scraper/requirements.txt`
- Create: `scraper/.env.example`
- Create: `scraper/pytest.ini`
- Create: `scraper/scraper/__init__.py`
- Create: `scraper/scraper/types.py`
- Create: `scraper/scraper/schools/__init__.py`
- Create: `scraper/tests/__init__.py`
- Create: `scraper/config/schools.yaml`

- [ ] **Step 1: Create `scraper/requirements.txt`**

```
requests==2.32.3
beautifulsoup4==4.12.3
playwright==1.47.0
openai==1.51.0
pyyaml==6.0.2
supabase==2.9.1
python-dotenv==1.0.1
pytest==8.3.3
```

- [ ] **Step 2: Create `scraper/.env.example`**

```
LLM_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
LLM_API_KEY=
LLM_MODEL=mimo-v2.5-pro
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 3: Create `scraper/pytest.ini`**

```ini
[pytest]
pythonpath = .
testpaths = tests
```

- [ ] **Step 4: Create `scraper/scraper/__init__.py`** (empty file)

- [ ] **Step 5: Create `scraper/scraper/schools/__init__.py`** (empty file)

- [ ] **Step 6: Create `scraper/tests/__init__.py`** (empty file)

- [ ] **Step 7: Create `scraper/scraper/types.py`**

```python
from dataclasses import dataclass, field


@dataclass
class SchoolConfig:
    slug: str
    name: str
    directory_url: str
    fetch_mode: str


@dataclass
class FacultyStub:
    name: str
    title: str | None
    profile_url: str


@dataclass
class ExtractedFields:
    phd_institution: str | None
    methodology: str | None
    topics: list[str] = field(default_factory=list)
    theories: list[str] = field(default_factory=list)
    personal_website_url: str | None = None
    google_scholar_url: str | None = None
```

- [ ] **Step 8: Create `scraper/config/schools.yaml`**

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
  directory_url: "https://www.anderson.ucla.edu/faculty-and-research/management-and-organizations/faculty"
  fetch_mode: rendered
```

- [ ] **Step 9: Set up Python virtual environment and install dependencies**

Run:
```bash
cd scraper && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt && .venv/bin/playwright install chromium
```
Expected: dependencies install successfully, chromium browser downloads for Playwright.

- [ ] **Step 10: Verify package imports correctly**

Run: `cd scraper && .venv/bin/python -c "from scraper.types import SchoolConfig, FacultyStub, ExtractedFields; print('OK')"`
Expected: `OK`

- [ ] **Step 11: Add `scraper/.venv/` to `.gitignore`**

Add a `scraper/.gitignore` file:
```
.venv/
.env
output/*.json
__pycache__/
*.pyc
```

- [ ] **Step 12: Commit**

```bash
git add scraper/
git commit -m "Scaffold Python scraper package with core types and config"
```

---

### Task 2: School config loader

**Files:**
- Create: `scraper/scraper/config.py`
- Create: `scraper/tests/fixtures/sample_schools.yaml`
- Test: `scraper/tests/test_config.py`

- [ ] **Step 1: Write the failing test**

Create `scraper/tests/fixtures/sample_schools.yaml`:
```yaml
- slug: test-school
  name: "Test School"
  directory_url: "https://example.edu/faculty"
  fetch_mode: static
```

Create `scraper/tests/test_config.py`:
```python
from pathlib import Path

from scraper.config import load_school_configs
from scraper.types import SchoolConfig

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_load_school_configs():
    configs = load_school_configs(FIXTURES_DIR / "sample_schools.yaml")

    assert configs == [
        SchoolConfig(
            slug="test-school",
            name="Test School",
            directory_url="https://example.edu/faculty",
            fetch_mode="static",
        )
    ]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_config.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.config'`

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/config.py`:
```python
from pathlib import Path

import yaml

from scraper.types import SchoolConfig


def load_school_configs(path: Path) -> list[SchoolConfig]:
    with open(path) as f:
        data = yaml.safe_load(f)
    return [SchoolConfig(**entry) for entry in data]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd scraper && .venv/bin/pytest tests/test_config.py -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/config.py scraper/tests/test_config.py scraper/tests/fixtures/sample_schools.yaml
git commit -m "Add school config loader"
```

---

### Task 3: Shared HTTP fetchers (static + rendered)

**Files:**
- Create: `scraper/scraper/fetch.py`
- Test: `scraper/tests/test_fetch.py`

- [ ] **Step 1: Write the failing tests**

Create `scraper/tests/test_fetch.py`:
```python
from unittest.mock import MagicMock, patch

from scraper.fetch import fetch_rendered, fetch_static


@patch("scraper.fetch.requests.get")
@patch("scraper.fetch.time.sleep")
def test_fetch_static_returns_soup(mock_sleep, mock_get):
    mock_response = MagicMock()
    mock_response.text = "<html><body><h1>Hello</h1></body></html>"
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response

    soup = fetch_static("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Hello"
    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["headers"]["User-Agent"].startswith(
        "StrategyPhDFacultyFinderBot"
    )


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_returns_soup(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"

    mock_browser = MagicMock()
    mock_browser.new_page.return_value = mock_page

    mock_chromium = MagicMock()
    mock_chromium.launch.return_value = mock_browser

    mock_playwright_instance = MagicMock()
    mock_playwright_instance.chromium = mock_chromium

    mock_playwright_cm = MagicMock()
    mock_playwright_cm.__enter__.return_value = mock_playwright_instance
    mock_playwright_cm.__exit__.return_value = None

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        soup = fetch_rendered("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Rendered"
    mock_page.goto.assert_called_once_with("https://example.edu/faculty", timeout=60000)
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_fetch.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.fetch'`

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/fetch.py`:
```python
import time

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)


def fetch_static(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a static page with requests + BeautifulSoup, with a polite delay."""
    time.sleep(delay)
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def fetch_rendered(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a JS-rendered page with headless Playwright Chromium."""
    from playwright.sync_api import sync_playwright

    time.sleep(delay)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(url, timeout=60000)
        page.wait_for_load_state("networkidle")
        html = page.content()
        browser.close()
    return BeautifulSoup(html, "html.parser")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_fetch.py -v`
Expected: PASS (2 passed)

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/fetch.py scraper/tests/test_fetch.py
git commit -m "Add shared static and rendered page fetchers"
```

---

### Task 4: LLM extraction client

**Files:**
- Create: `scraper/scraper/extract.py`
- Test: `scraper/tests/test_extract.py`

- [ ] **Step 1: Write the failing tests**

Create `scraper/tests/test_extract.py`:
```python
import json
from unittest.mock import MagicMock

import pytest

from scraper.extract import ExtractionError, extract_faculty_fields
from scraper.types import ExtractedFields


def _mock_response(content: dict) -> MagicMock:
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=json.dumps(content)))]
    return response


def test_short_bio_skips_llm_call():
    client = MagicMock()

    result = extract_faculty_fields("Jane Doe", "Professor", "Too short.", client, "test-model")

    assert result == ExtractedFields(phd_institution=None, methodology=None)
    client.chat.completions.create.assert_not_called()


def test_successful_extraction_parses_response():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "phd_institution": "MIT",
            "methodology": "Quantitative",
            "topics": ["Innovation", "Corporate Strategy"],
            "theories": ["RBV"],
            "personal_website_url": None,
            "google_scholar_url": "https://scholar.google.com/citations?user=abc123",
        }
    )

    bio = (
        "Jane Doe is an Assistant Professor whose research focuses on "
        "innovation and corporate strategy in technology firms over many "
        "years of study."
    )
    result = extract_faculty_fields("Jane Doe", "Assistant Professor", bio, client, "test-model")

    assert result == ExtractedFields(
        phd_institution="MIT",
        methodology="Quantitative",
        topics=["Innovation", "Corporate Strategy"],
        theories=["RBV"],
        personal_website_url=None,
        google_scholar_url="https://scholar.google.com/citations?user=abc123",
    )


def test_retries_on_error_then_succeeds(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = [
        RuntimeError("temporary failure"),
        _mock_response(
            {
                "phd_institution": "Stanford",
                "methodology": "Qualitative",
                "topics": ["Entrepreneurship"],
                "theories": [],
                "personal_website_url": None,
                "google_scholar_url": None,
            }
        ),
    ]

    bio = (
        "A long enough bio describing research on entrepreneurship and new "
        "venture creation across many industries."
    )
    result = extract_faculty_fields("John Smith", "Professor", bio, client, "test-model")

    assert result.phd_institution == "Stanford"
    assert client.chat.completions.create.call_count == 2


def test_raises_after_max_attempts(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("permanent failure")

    bio = (
        "A long enough bio describing research on entrepreneurship and new "
        "venture creation across many industries."
    )

    with pytest.raises(ExtractionError):
        extract_faculty_fields("John Smith", "Professor", bio, client, "test-model")

    assert client.chat.completions.create.call_count == 3
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_extract.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.extract'`

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/extract.py`:
```python
import json
import os
import time

from scraper.types import ExtractedFields

EXTRACTION_SYSTEM_PROMPT = """You are extracting structured information from a university faculty member's biography.
Given the faculty member's name, title, and bio text, return a JSON object with exactly these fields:
- "phd_institution": string or null - the institution where they earned their PhD
- "methodology": one of "Quantitative", "Qualitative", "Mixed", "Experimental", "Computational", or null
- "topics": array of strings - 1 to 4 research topics most prominent in the bio (e.g. "Innovation", "Mergers and Acquisitions", "Corporate Governance")
- "theories": array of strings - theoretical frameworks the faculty member uses (e.g. "Resource-Based View", "Agency Theory"), empty array if none mentioned
- "personal_website_url": string or null - personal website URL if mentioned in the bio
- "google_scholar_url": string or null - Google Scholar profile URL if mentioned in the bio

Return null for any field you cannot determine. Respond with ONLY the JSON object, no other text."""

MIN_BIO_LENGTH = 50
MAX_ATTEMPTS = 3


class ExtractionError(Exception):
    """Raised when LLM extraction fails after all retries."""


def extract_faculty_fields(
    name: str, title: str | None, bio_text: str, client, model: str
) -> ExtractedFields:
    if not bio_text or len(bio_text.strip()) < MIN_BIO_LENGTH:
        return ExtractedFields(phd_institution=None, methodology=None)

    user_message = f"Name: {name}\nTitle: {title or 'Unknown'}\nBio:\n{bio_text}"

    last_error: Exception | None = None
    for attempt in range(MAX_ATTEMPTS):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content)
            return ExtractedFields(
                phd_institution=data.get("phd_institution"),
                methodology=data.get("methodology"),
                topics=data.get("topics") or [],
                theories=data.get("theories") or [],
                personal_website_url=data.get("personal_website_url"),
                google_scholar_url=data.get("google_scholar_url"),
            )
        except Exception as error:
            last_error = error
            if attempt < MAX_ATTEMPTS - 1:
                time.sleep(2**attempt)

    raise ExtractionError(f"LLM extraction failed after {MAX_ATTEMPTS} attempts: {last_error}")


def build_client():
    from openai import OpenAI

    return OpenAI(
        base_url=os.environ["LLM_BASE_URL"],
        api_key=os.environ["LLM_API_KEY"],
    )


def get_model() -> str:
    return os.environ.get("LLM_MODEL", "mimo-v2.5-pro")
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_extract.py -v`
Expected: PASS (4 passed)

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/extract.py scraper/tests/test_extract.py
git commit -m "Add LLM extraction client for faculty bio fields"
```

---

### Task 5: Wharton scraper

**Files:**
- Create: `scraper/scraper/schools/wharton.py`
- Create: `scraper/tests/fixtures/wharton_directory.html`
- Create: `scraper/tests/fixtures/wharton_profile_sample.html`
- Test: `scraper/tests/test_schools_wharton.py`

- [ ] **Step 1: Research the live Wharton faculty directory**

Use the WebFetch tool (or browser tools) to load:
`https://www.wharton.upenn.edu/faculty-research/faculty-directory/?department=mgmt`

Confirm: faculty entries are `<a>` elements with a `title` attribute formatted as
`"Name | Title, Affiliation"` and an `href` to the faculty's profile page (the href
may be a relative path like `/faculty/jane-doe`).

Save the raw HTML of this page to `scraper/tests/fixtures/wharton_directory.html`
(fetch it and write the response body to that file — e.g. via
`curl -A "StrategyPhDFacultyFinderBot/0.1 (+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)" "https://www.wharton.upenn.edu/faculty-research/faculty-directory/?department=mgmt" -o scraper/tests/fixtures/wharton_directory.html`).

- [ ] **Step 2: Research a sample Wharton faculty profile page**

Pick one profile URL found in Step 1 (a Management department faculty member). Use
WebFetch/browser to load it and identify the HTML element containing the faculty
bio text (look for a heading like "Research" or "Biography" followed by paragraph
text, or a content `<div>` with a class name related to bio/content).

Save the raw HTML of this profile page to
`scraper/tests/fixtures/wharton_profile_sample.html` (same `curl` approach as
Step 1, with the profile URL).

- [ ] **Step 3: Write the failing test**

Create `scraper/tests/test_schools_wharton.py`:
```python
from pathlib import Path

from bs4 import BeautifulSoup

from scraper.schools.wharton import parse_bio, parse_faculty_list

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> BeautifulSoup:
    html = (FIXTURES_DIR / name).read_text()
    return BeautifulSoup(html, "html.parser")


def test_parse_faculty_list_returns_stubs_with_absolute_urls():
    soup = _load_fixture("wharton_directory.html")

    stubs = parse_faculty_list(soup)

    assert len(stubs) > 0
    for stub in stubs:
        assert stub.name
        assert stub.profile_url.startswith("https://www.wharton.upenn.edu")


def test_parse_bio_extracts_nonempty_text():
    soup = _load_fixture("wharton_profile_sample.html")

    bio = parse_bio(soup)

    assert isinstance(bio, str)
    assert len(bio.strip()) > 50
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_wharton.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.schools.wharton'`

- [ ] **Step 5: Write implementation**

Create `scraper/scraper/schools/wharton.py`. Implement `parse_faculty_list` based on
the structure confirmed in Step 1 (`<a title="Name | Title">` with `href` resolved
to an absolute URL via `urljoin`), and `parse_bio` based on the bio container
identified in Step 2. Start from this skeleton and adjust the `parse_bio` selector
to match what Step 2 found:

```python
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.wharton.upenn.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    stubs = []
    seen_urls = set()
    for link in soup.select("a[title]"):
        title_attr = link.get("title", "")
        if "|" not in title_attr:
            continue
        name_part, _, rest = title_attr.partition("|")
        name = name_part.strip()
        title = rest.strip() or None
        href = link.get("href")
        if not name or not href:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)
        stubs.append(FacultyStub(name=name, title=title, profile_url=profile_url))
    return stubs


def parse_bio(soup: BeautifulSoup) -> str:
    container = soup.select_one(".faculty-bio, .field--name-field-bio, article")
    if container is None:
        container = soup
    paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    return "\n\n".join(p for p in paragraphs if p)


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_static(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_static(stub.profile_url)
    return parse_bio(soup)
```

If Step 2's research found a more specific bio container selector, replace the
`.select_one(...)` argument with that selector.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_wharton.py -v`
Expected: PASS (2 passed). If `parse_bio` returns text under 50 chars, inspect
`wharton_profile_sample.html` and adjust the selector in `parse_bio` until it
extracts the actual bio paragraphs.

- [ ] **Step 7: Commit**

```bash
git add scraper/scraper/schools/wharton.py scraper/tests/test_schools_wharton.py scraper/tests/fixtures/wharton_directory.html scraper/tests/fixtures/wharton_profile_sample.html
git commit -m "Add Wharton faculty directory and bio scraper"
```

---

### Task 6: Chicago Booth scraper

**Files:**
- Create: `scraper/scraper/schools/chicago_booth.py`
- Create: `scraper/tests/fixtures/chicago_booth_directory.html`
- Create: `scraper/tests/fixtures/chicago_booth_profile_sample.html`
- Test: `scraper/tests/test_schools_chicago_booth.py`
- Modify: `scraper/config/schools.yaml` (if the directory URL needs correction)

- [ ] **Step 1: Research the live Chicago Booth faculty directory**

Chicago Booth's faculty directory (`https://www.chicagobooth.edu/faculty/directory`)
is JS-driven. Use a browser tool (`mcp__playwright__browser_navigate` to the URL,
then `mcp__playwright__browser_snapshot` or `mcp__playwright__browser_evaluate`) to:

1. Load the directory page and apply/observe the "Strategy and Leadership" area
   filter (this may be a query parameter like `?area=strategy-and-leadership`, or
   a client-side filter — check the network requests with
   `mcp__playwright__browser_network_requests` for an underlying JSON/API endpoint).
2. Identify the HTML structure (or JSON shape, if there's an API endpoint) for each
   faculty entry: name, title, profile URL.

Save the rendered HTML (after the Strategy filter is applied) to
`scraper/tests/fixtures/chicago_booth_directory.html` using
`mcp__playwright__browser_evaluate` to run `document.documentElement.outerHTML` and
write the result to that file. If the directory is filterable via a URL query
parameter, update `directory_url` in `scraper/config/schools.yaml` to that URL.

- [ ] **Step 2: Research a sample Chicago Booth faculty profile page**

Pick one Strategy-area faculty profile URL from Step 1. Navigate to it and identify
the bio text container. Save its rendered HTML to
`scraper/tests/fixtures/chicago_booth_profile_sample.html`.

- [ ] **Step 3: Write the failing test**

Create `scraper/tests/test_schools_chicago_booth.py`:
```python
from pathlib import Path

from bs4 import BeautifulSoup

from scraper.schools.chicago_booth import parse_bio, parse_faculty_list

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> BeautifulSoup:
    html = (FIXTURES_DIR / name).read_text()
    return BeautifulSoup(html, "html.parser")


def test_parse_faculty_list_returns_stubs_with_absolute_urls():
    soup = _load_fixture("chicago_booth_directory.html")

    stubs = parse_faculty_list(soup)

    assert len(stubs) > 0
    for stub in stubs:
        assert stub.name
        assert stub.profile_url.startswith("https://www.chicagobooth.edu")


def test_parse_bio_extracts_nonempty_text():
    soup = _load_fixture("chicago_booth_profile_sample.html")

    bio = parse_bio(soup)

    assert isinstance(bio, str)
    assert len(bio.strip()) > 50
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_chicago_booth.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.schools.chicago_booth'`

- [ ] **Step 5: Write implementation**

Create `scraper/scraper/schools/chicago_booth.py`, following the structure found
during Steps 1-2. Use `fetch_rendered` (since `fetch_mode: rendered` in config).
Base structure:

```python
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.chicagobooth.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Implement based on the structure found in Step 1's saved fixture."""
    raise NotImplementedError


def parse_bio(soup: BeautifulSoup) -> str:
    """Implement based on the structure found in Step 2's saved fixture."""
    raise NotImplementedError


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return parse_bio(soup)
```

Replace the `raise NotImplementedError` bodies with real parsing logic: open
`scraper/tests/fixtures/chicago_booth_directory.html` and
`chicago_booth_profile_sample.html` in a text editor or via
`python -c "print(open('...').read()[:5000])"` to find the actual CSS selectors for
faculty entries (name, title, profile link) and the bio container, then write
`soup.select(...)` / `soup.select_one(...)` calls accordingly — following the same
pattern as `scraper/scraper/schools/wharton.py` (urljoin for relative hrefs,
collect paragraph text for bio).

- [ ] **Step 6: Run test to verify it passes**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_chicago_booth.py -v`
Expected: PASS (2 passed). Iterate on selectors until both assertions pass.

- [ ] **Step 7: Commit**

```bash
git add scraper/scraper/schools/chicago_booth.py scraper/tests/test_schools_chicago_booth.py scraper/tests/fixtures/chicago_booth_directory.html scraper/tests/fixtures/chicago_booth_profile_sample.html scraper/config/schools.yaml
git commit -m "Add Chicago Booth faculty directory and bio scraper"
```

---

### Task 7: UCLA Anderson scraper

**Files:**
- Create: `scraper/scraper/schools/ucla_anderson.py`
- Create: `scraper/tests/fixtures/ucla_anderson_directory.html`
- Create: `scraper/tests/fixtures/ucla_anderson_profile_sample.html`
- Test: `scraper/tests/test_schools_ucla_anderson.py`
- Modify: `scraper/config/schools.yaml` (correct `directory_url` and `fetch_mode`)

- [ ] **Step 1: Research the live UCLA Anderson faculty directory**

The placeholder URL in `scraper/config/schools.yaml`
(`https://www.anderson.ucla.edu/faculty-and-research/management-and-organizations/faculty`)
needs verification. Use a browser tool
(`mcp__playwright__browser_navigate` + `mcp__playwright__browser_snapshot`) to:

1. Find UCLA Anderson's actual faculty directory page for the Strategy /
   Management & Organizations area (navigate from `https://www.anderson.ucla.edu`
   faculty/research section if the placeholder URL 404s).
2. Determine whether the page is static or JS-rendered (check if faculty names
   appear in the initial HTML via `mcp__playwright__browser_evaluate` running
   `document.documentElement.outerHTML` vs. what's visible in the snapshot).
3. Identify the HTML structure for each faculty entry: name, title, profile URL.

Update `directory_url` and `fetch_mode` in `scraper/config/schools.yaml` to match
what you find. Save the rendered HTML to
`scraper/tests/fixtures/ucla_anderson_directory.html`.

- [ ] **Step 2: Research a sample UCLA Anderson faculty profile page**

Pick one Strategy-area faculty profile URL from Step 1. Navigate to it and identify
the bio text container. Save its rendered HTML to
`scraper/tests/fixtures/ucla_anderson_profile_sample.html`.

- [ ] **Step 3: Write the failing test**

Create `scraper/tests/test_schools_ucla_anderson.py`:
```python
from pathlib import Path

from bs4 import BeautifulSoup

from scraper.schools.ucla_anderson import parse_bio, parse_faculty_list

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> BeautifulSoup:
    html = (FIXTURES_DIR / name).read_text()
    return BeautifulSoup(html, "html.parser")


def test_parse_faculty_list_returns_stubs_with_absolute_urls():
    soup = _load_fixture("ucla_anderson_directory.html")

    stubs = parse_faculty_list(soup)

    assert len(stubs) > 0
    for stub in stubs:
        assert stub.name
        assert stub.profile_url.startswith("https://www.anderson.ucla.edu")


def test_parse_bio_extracts_nonempty_text():
    soup = _load_fixture("ucla_anderson_profile_sample.html")

    bio = parse_bio(soup)

    assert isinstance(bio, str)
    assert len(bio.strip()) > 50
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_ucla_anderson.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.schools.ucla_anderson'`

- [ ] **Step 5: Write implementation**

Create `scraper/scraper/schools/ucla_anderson.py`, following the same pattern as
`scraper/scraper/schools/wharton.py` and `chicago_booth.py`: a `parse_faculty_list`
and `parse_bio` pure function operating on a `BeautifulSoup`, plus
`scrape_faculty_list`/`scrape_bio` wrappers using `fetch_static` or `fetch_rendered`
depending on the `fetch_mode` determined in Step 1:

```python
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered, fetch_static
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.anderson.ucla.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Implement based on the structure found in Step 1's saved fixture."""
    raise NotImplementedError


def parse_bio(soup: BeautifulSoup) -> str:
    """Implement based on the structure found in Step 2's saved fixture."""
    raise NotImplementedError


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    fetcher = fetch_static if config.fetch_mode == "static" else fetch_rendered
    soup = fetcher(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    fetcher = fetch_static if config.fetch_mode == "static" else fetch_rendered
    soup = fetcher(stub.profile_url)
    return parse_bio(soup)
```

Replace the `raise NotImplementedError` bodies with real parsing logic derived from
the saved fixtures, as described in Task 6 Step 5.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd scraper && .venv/bin/pytest tests/test_schools_ucla_anderson.py -v`
Expected: PASS (2 passed).

- [ ] **Step 7: Commit**

```bash
git add scraper/scraper/schools/ucla_anderson.py scraper/tests/test_schools_ucla_anderson.py scraper/tests/fixtures/ucla_anderson_directory.html scraper/tests/fixtures/ucla_anderson_profile_sample.html scraper/config/schools.yaml
git commit -m "Add UCLA Anderson faculty directory and bio scraper"
```

---

### Task 8: Pipeline orchestration

**Files:**
- Create: `scraper/scraper/pipeline.py`
- Test: `scraper/tests/test_pipeline.py`

- [ ] **Step 1: Write the failing tests**

Create `scraper/tests/test_pipeline.py`:
```python
import json
from unittest.mock import MagicMock

import scraper.pipeline as pipeline_module
from scraper.pipeline import scrape_school
from scraper.types import FacultyStub, SchoolConfig


def _llm_client(payload: dict) -> MagicMock:
    client = MagicMock()
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=json.dumps(payload)))]
    )
    return client


def test_scrape_school_assembles_records(monkeypatch):
    config = SchoolConfig(
        slug="wharton",
        name="Wharton (UPenn)",
        directory_url="https://example.edu/faculty",
        fetch_mode="static",
    )

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(
            name="Jane Doe",
            title="Assistant Professor",
            profile_url="https://example.edu/jane-doe",
        ),
    ]
    fake_module.scrape_bio.return_value = (
        "Jane Doe studies innovation and corporate strategy in technology firms."
    )
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": "MIT",
            "methodology": "Quantitative",
            "topics": ["Innovation"],
            "theories": ["RBV"],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )

    records = scrape_school(config, client, "test-model")

    assert len(records) == 1
    record = records[0]
    assert record["name"] == "Jane Doe"
    assert record["title"] == "Assistant Professor"
    assert record["school_profile_url"] == "https://example.edu/jane-doe"
    assert record["phd_institution"] == "MIT"
    assert record["methodology"] == "Quantitative"
    assert record["topics"] == ["Innovation"]
    assert record["theories"] == ["RBV"]
    assert record["bio_hash"].startswith("sha256:")


def test_scrape_school_respects_limit(monkeypatch):
    config = SchoolConfig(
        slug="wharton",
        name="Wharton (UPenn)",
        directory_url="https://example.edu/faculty",
        fetch_mode="static",
    )

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(name="A", title="Professor", profile_url="https://example.edu/a"),
        FacultyStub(name="B", title="Professor", profile_url="https://example.edu/b"),
    ]
    fake_module.scrape_bio.return_value = "x" * 100
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": None,
            "methodology": None,
            "topics": [],
            "theories": [],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )

    records = scrape_school(config, client, "test-model", limit=1)

    assert len(records) == 1
    assert fake_module.scrape_bio.call_count == 1


def test_run_pipeline_writes_output_json(tmp_path, monkeypatch):
    config_path = tmp_path / "schools.yaml"
    config_path.write_text(
        "- slug: wharton\n"
        "  name: Wharton (UPenn)\n"
        "  directory_url: https://example.edu/faculty\n"
        "  fetch_mode: static\n"
    )
    output_dir = tmp_path / "output"

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/jane-doe"),
    ]
    fake_module.scrape_bio.return_value = "x" * 100
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": None,
            "methodology": None,
            "topics": [],
            "theories": [],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )
    monkeypatch.setattr(pipeline_module, "build_client", lambda: client)
    monkeypatch.setattr(pipeline_module, "get_model", lambda: "test-model")

    pipeline_module.run_pipeline(config_path, output_dir)

    output_file = output_dir / "wharton.json"
    assert output_file.exists()
    data = json.loads(output_file.read_text())
    assert len(data) == 1
    assert data[0]["name"] == "Jane Doe"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_pipeline.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.pipeline'`

- [ ] **Step 3: Write minimal implementation**

Create `scraper/scraper/pipeline.py`:
```python
import hashlib
import json
import os
from pathlib import Path

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
    module = SCRAPER_MODULES[config.slug]
    stubs = module.scrape_faculty_list(config)
    if limit is not None:
        stubs = stubs[:limit]

    records = []
    for stub in stubs:
        bio_text = module.scrape_bio(config, stub)
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


def run_pipeline(config_path: Path, output_dir: Path, limit: int | None = None) -> None:
    configs = load_school_configs(config_path)
    client = build_client()
    model = get_model()

    output_dir.mkdir(parents=True, exist_ok=True)
    for config in configs:
        records = scrape_school(config, client, model, limit=limit)
        output_path = output_dir / f"{config.slug}.json"
        output_path.write_text(json.dumps(records, indent=2))


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    limit_env = os.environ.get("SCRAPE_LIMIT")
    run_pipeline(
        config_path=repo_root / "config" / "schools.yaml",
        output_dir=repo_root / "output",
        limit=int(limit_env) if limit_env else None,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_pipeline.py -v`
Expected: PASS (3 passed)

- [ ] **Step 5: Commit**

```bash
git add scraper/scraper/pipeline.py scraper/tests/test_pipeline.py
git commit -m "Add pipeline orchestration with per-school scrape and extract"
```

---

### Task 9: Add `bio_hash` column migration

**Files:**
- Create: `supabase/migrations/0001_add_bio_hash.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/0001_add_bio_hash.sql`:
```sql
alter table faculty add column bio_hash text;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0001_add_bio_hash.sql
git commit -m "Add bio_hash column migration for change detection"
```

---

### Task 10: Supabase upsert script

**Files:**
- Create: `scraper/scraper/upsert.py`
- Create: `scraper/tests/fake_supabase.py`
- Test: `scraper/tests/test_upsert.py`

- [ ] **Step 1: Write the fake Supabase client test double**

Create `scraper/tests/fake_supabase.py`:
```python
import itertools


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table):
        self.table = table
        self.filters = []
        self.op = None
        self.payload = None

    def select(self, _cols):
        self.op = "select"
        return self

    def insert(self, payload):
        self.op = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.op = "update"
        self.payload = payload
        return self

    def delete(self):
        self.op = "delete"
        return self

    def eq(self, col, value):
        self.filters.append(("eq", col, value))
        return self

    def ilike(self, col, value):
        self.filters.append(("ilike", col, value))
        return self

    def _matches(self, row):
        for kind, col, value in self.filters:
            if kind == "eq" and row.get(col) != value:
                return False
            if kind == "ilike" and str(row.get(col, "")).lower() != str(value).lower():
                return False
        return True

    def execute(self):
        rows = self.table.rows
        if self.op == "select":
            return FakeResult([dict(row) for row in rows if self._matches(row)])
        if self.op == "insert":
            new_row = dict(self.payload)
            new_row["id"] = self.table.next_id()
            rows.append(new_row)
            return FakeResult([dict(new_row)])
        if self.op == "update":
            updated = []
            for row in rows:
                if self._matches(row):
                    row.update(self.payload)
                    updated.append(dict(row))
            return FakeResult(updated)
        if self.op == "delete":
            removed = [row for row in rows if self._matches(row)]
            self.table.rows[:] = [row for row in rows if not self._matches(row)]
            return FakeResult(removed)
        raise ValueError("No operation specified")


class FakeTable:
    def __init__(self, name):
        self.name = name
        self.rows: list[dict] = []
        self._ids = itertools.count(1)

    def next_id(self):
        return f"{self.name}-{next(self._ids)}"


class FakeSupabaseClient:
    def __init__(self):
        self.tables: dict[str, FakeTable] = {}

    def table(self, name):
        if name not in self.tables:
            self.tables[name] = FakeTable(name)
        return FakeQuery(self.tables[name])

    def seed(self, table_name, rows):
        table = self.tables.setdefault(table_name, FakeTable(table_name))
        for row in rows:
            row = dict(row)
            row.setdefault("id", table.next_id())
            table.rows.append(row)
        return table.rows
```

- [ ] **Step 2: Write the failing tests**

Create `scraper/tests/test_upsert.py`:
```python
from scraper.upsert import upsert_school_data
from tests.fake_supabase import FakeSupabaseClient


def _record(**overrides):
    base = {
        "name": "Jane Doe",
        "title": "Assistant Professor",
        "school_profile_url": "https://example.edu/jane-doe",
        "personal_website_url": None,
        "google_scholar_url": None,
        "phd_institution": "MIT",
        "methodology": "Quantitative",
        "topics": ["Innovation"],
        "theories": ["RBV"],
        "bio_hash": "sha256:abc",
    }
    base.update(overrides)
    return base


def test_inserts_new_faculty_with_needs_review():
    client = FakeSupabaseClient()
    client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])

    upsert_school_data(client, "wharton", [_record()])

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["name"] == "Jane Doe"
    assert faculty_rows[0]["needs_review"] is True

    topic_rows = client.tables["topics"].rows
    assert [row["name"] for row in topic_rows] == ["Innovation"]

    junction_rows = client.tables["faculty_topics"].rows
    assert len(junction_rows) == 1
    assert junction_rows[0]["faculty_id"] == faculty_rows[0]["id"]
    assert junction_rows[0]["topic_id"] == topic_rows[0]["id"]


def test_unchanged_bio_hash_does_not_set_needs_review():
    client = FakeSupabaseClient()
    school = client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])[0]
    client.seed(
        "faculty",
        [
            {
                "name": "Jane Doe",
                "school_id": school["id"],
                "title": "Assistant Professor",
                "bio_hash": "sha256:abc",
                "needs_review": False,
            }
        ],
    )

    upsert_school_data(client, "wharton", [_record(bio_hash="sha256:abc")])

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["needs_review"] is False


def test_changed_bio_hash_sets_needs_review():
    client = FakeSupabaseClient()
    school = client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])[0]
    client.seed(
        "faculty",
        [
            {
                "name": "Jane Doe",
                "school_id": school["id"],
                "title": "Assistant Professor",
                "bio_hash": "sha256:old",
                "needs_review": False,
            }
        ],
    )

    upsert_school_data(
        client, "wharton", [_record(bio_hash="sha256:new", phd_institution="Stanford")]
    )

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["needs_review"] is True
    assert faculty_rows[0]["phd_institution"] == "Stanford"


def test_existing_topic_is_reused_case_insensitively():
    client = FakeSupabaseClient()
    client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])
    client.seed("topics", [{"name": "innovation"}])

    upsert_school_data(client, "wharton", [_record(topics=["Innovation"])])

    topic_rows = client.tables["topics"].rows
    assert len(topic_rows) == 1
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd scraper && .venv/bin/pytest tests/test_upsert.py -v`
Expected: FAIL with `ModuleNotFoundError: No module named 'scraper.upsert'`

- [ ] **Step 4: Write minimal implementation**

Create `scraper/scraper/upsert.py`:
```python
import json
import os
from pathlib import Path


def get_school_id(supabase, slug: str) -> str:
    result = supabase.table("schools").select("id").eq("slug", slug).execute()
    if not result.data:
        raise ValueError(f"School with slug '{slug}' not found in schools table")
    return result.data[0]["id"]


def get_or_create_tag_id(supabase, table: str, name: str) -> str:
    result = supabase.table(table).select("id").ilike("name", name).execute()
    if result.data:
        return result.data[0]["id"]
    result = supabase.table(table).insert({"name": name}).execute()
    return result.data[0]["id"]


def upsert_faculty_record(supabase, school_id: str, record: dict) -> str:
    existing = (
        supabase.table("faculty")
        .select("id, bio_hash")
        .eq("school_id", school_id)
        .eq("name", record["name"])
        .execute()
    )

    fields = {
        "name": record["name"],
        "school_id": school_id,
        "title": record["title"],
        "phd_institution": record["phd_institution"],
        "school_profile_url": record["school_profile_url"],
        "personal_website_url": record["personal_website_url"],
        "google_scholar_url": record["google_scholar_url"],
        "methodology": record["methodology"],
        "bio_hash": record["bio_hash"],
    }

    if not existing.data:
        fields["needs_review"] = True
        result = supabase.table("faculty").insert(fields).execute()
        return result.data[0]["id"]

    existing_row = existing.data[0]
    faculty_id = existing_row["id"]
    if existing_row.get("bio_hash") != record["bio_hash"]:
        fields["needs_review"] = True
        supabase.table("faculty").update(fields).eq("id", faculty_id).execute()

    return faculty_id


def replace_faculty_tags(
    supabase, faculty_id: str, tag_names: list[str], lookup_table: str, junction_table: str, junction_fk: str
) -> None:
    supabase.table(junction_table).delete().eq("faculty_id", faculty_id).execute()
    for name in tag_names:
        tag_id = get_or_create_tag_id(supabase, lookup_table, name)
        supabase.table(junction_table).insert({"faculty_id": faculty_id, junction_fk: tag_id}).execute()


def upsert_school_data(supabase, school_slug: str, records: list[dict]) -> None:
    school_id = get_school_id(supabase, school_slug)
    for record in records:
        faculty_id = upsert_faculty_record(supabase, school_id, record)
        replace_faculty_tags(supabase, faculty_id, record["topics"], "topics", "faculty_topics", "topic_id")
        replace_faculty_tags(supabase, faculty_id, record["theories"], "theories", "faculty_theories", "theory_id")


def main() -> None:
    from supabase import create_client

    from scraper.config import load_school_configs

    repo_root = Path(__file__).resolve().parent.parent
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    for school_config in load_school_configs(repo_root / "config" / "schools.yaml"):
        output_path = repo_root / "output" / f"{school_config.slug}.json"
        if not output_path.exists():
            continue
        records = json.loads(output_path.read_text())
        upsert_school_data(client, school_config.slug, records)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd scraper && .venv/bin/pytest tests/test_upsert.py -v`
Expected: PASS (4 passed)

- [ ] **Step 6: Commit**

```bash
git add scraper/scraper/upsert.py scraper/tests/fake_supabase.py scraper/tests/test_upsert.py
git commit -m "Add Supabase upsert with needs_review flagging"
```

---

### Task 11: GitHub Actions scheduled workflow

**Files:**
- Create: `.github/workflows/scrape.yml`

- [ ] **Step 1: Create the workflow file**

Create `.github/workflows/scrape.yml`:
```yaml
name: Quarterly Faculty Scrape

on:
  schedule:
    - cron: "0 6 1 1,4,7,10 *"
  workflow_dispatch: {}

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        working-directory: scraper
        run: |
          pip install -r requirements.txt
          playwright install chromium

      - name: Run scraping pipeline
        working-directory: scraper
        env:
          LLM_BASE_URL: ${{ secrets.LLM_BASE_URL }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_MODEL: ${{ secrets.LLM_MODEL }}
        run: python -m scraper.pipeline

      - name: Upsert into Supabase
        working-directory: scraper
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: python -m scraper.upsert

      - uses: actions/upload-artifact@v4
        with:
          name: scrape-output
          path: scraper/output/
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/scrape.yml
git commit -m "Add scheduled GitHub Actions workflow for quarterly scraping"
```

---

### Task 12: Live validation smoke run

**Files:**
- None created/modified by this task (validation only); may update fixtures from
  Tasks 5-7 if live structure differs from what was captured earlier.

- [ ] **Step 1: Create local `.env` with real LLM credentials**

Create `scraper/.env` (gitignored, not committed):
```
LLM_BASE_URL=https://token-plan-sgp.xiaomimimo.com/v1
LLM_API_KEY=<the key the user provided>
LLM_MODEL=mimo-v2.5-pro
```

- [ ] **Step 2: Run the pipeline against real sites with a small limit**

Run:
```bash
cd scraper && set -a && source .env && set +a && SCRAPE_LIMIT=2 .venv/bin/python -m scraper.pipeline
```
Expected: completes without errors, writes `scraper/output/wharton.json`,
`scraper/output/chicago-booth.json`, `scraper/output/ucla-anderson.json`, each
containing 2 faculty records with non-null `name`, `school_profile_url`, and
`bio_hash`, and at least some non-null `topics`/`methodology`/`phd_institution`
fields from the LLM extraction.

- [ ] **Step 3: Inspect output for sanity**

Run: `cat scraper/output/wharton.json scraper/output/chicago-booth.json scraper/output/ucla-anderson.json`

Check that names look like real faculty names, `topics`/`theories` are plausible
research areas (not hallucinated nonsense), and `bio_hash` values are present. If
any school's scraper produced empty `bio_text` (all-null extracted fields) or
wrong faculty (not Strategy-area), revisit that school's `parse_faculty_list`/
`parse_bio` from Tasks 5-7 and adjust selectors, then re-run Step 2.

- [ ] **Step 4: Run the full test suite**

Run: `cd scraper && .venv/bin/pytest -v`
Expected: all tests pass.

No commit for this task — `scraper/output/*.json` is gitignored (per Task 1's
`scraper/.gitignore`) since it contains live-scraped data, not test fixtures.

---

### Task 13: Scraper README and final review

**Files:**
- Create: `scraper/README.md`

- [ ] **Step 1: Write `scraper/README.md`**

```markdown
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
```

- [ ] **Step 2: Run the full test suite one final time**

Run: `cd scraper && .venv/bin/pytest -v`
Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add scraper/README.md
git commit -m "Add scraper README with setup and usage instructions"
```
