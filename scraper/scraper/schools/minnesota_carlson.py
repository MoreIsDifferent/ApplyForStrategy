from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://carlsonschool.umn.edu"

# Non-person /faculty/ links to skip (section/landing pages).
SKIP_SLUGS = {"faculty", "faculty-research"}


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Carlson Strategic Management & Entrepreneurship faculty page.

    Faculty link to ``/faculty/<slug>`` with their name as the link text. The
    generic LLM extractor recovered none (the dense card grid read as
    boilerplate).
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select('a[href*="/faculty/"]'):
        href = link.get("href", "")
        slug = href.rstrip("/").rsplit("/", 1)[-1]
        if not slug or slug in SKIP_SLUGS:
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
    soup = fetch_static(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_static(stub.profile_url)
    return clean_html_to_text(str(soup))
