from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.rhsmith.umd.edu"

# The department faculty listing is a Drupal view paginated via ?page=N.
# Stop after this many empty pages to guard against an unbounded loop.
MAX_PAGES = 20


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse one page of the Smith M&O directory into stubs.

    Faculty link to ``/directory/<slug>`` with their name as the link text.
    The generic LLM extractor only recovered two because the page renders a
    dense card grid it mis-read as boilerplate.
    """
    stubs: list[FacultyStub] = []
    seen: set[str] = set()
    for link in soup.select('a[href*="/directory/"]'):
        href = link.get("href", "")
        slug = href.split("/directory/")[-1]
        # Skip nested links like /directory/ (empty) or sub-pages with a slash.
        if not slug or "/" in slug:
            continue
        name = link.get_text(strip=True)
        if not name or len(name) < 3:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        stubs.append(FacultyStub(name=name, title=None, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    sep = "&" if "?" in config.directory_url else "?"
    all_stubs: list[FacultyStub] = []
    seen: set[str] = set()
    for page in range(MAX_PAGES):
        soup = fetch_static(f"{config.directory_url}{sep}page={page}")
        page_stubs = parse_faculty_list(soup)
        new = [s for s in page_stubs if s.profile_url not in seen]
        if not new:
            break
        for s in new:
            seen.add(s.profile_url)
        all_stubs.extend(new)
    return all_stubs


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_static(stub.profile_url)
    return clean_html_to_text(str(soup))
