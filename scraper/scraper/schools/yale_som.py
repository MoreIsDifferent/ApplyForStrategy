from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://som.yale.edu"

# Area-group landing slugs under /faculty-directory/ that are not people.
AREA_SLUGS = {
    "faculty-directory", "accounting", "economics", "finance", "marketing",
    "operations", "organizational-behavior",
}


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse a Yale SOM faculty-directory area page into stubs.

    Faculty link to ``/faculty-research/faculty-directory/<slug>`` with their
    name as link text. The page is JS-rendered, so a static fetch only saw the
    area-category nav links (hence 0 faculty before).
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select('a[href*="/faculty-research/faculty-directory/"]'):
        href = link.get("href", "")
        slug = href.rstrip("/").rsplit("/", 1)[-1]
        if not slug or slug in AREA_SLUGS:
            continue
        name = link.get_text(strip=True).split("\n")[0].strip()
        if not name or len(name) < 3:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        stubs.append(FacultyStub(name=name, title=None, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
