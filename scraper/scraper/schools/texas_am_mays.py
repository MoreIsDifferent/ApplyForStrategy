import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://mays.tamu.edu"

# Name suffixes that should stay upper-cased when rebuilt from a URL slug.
_SUFFIXES = {"ii": "II", "iii": "III", "iv": "IV", "jr": "Jr.", "sr": "Sr."}


def _name_from_slug(slug: str) -> str:
    parts = [p for p in slug.strip("/").split("-") if p]
    words = [_SUFFIXES.get(p, p.capitalize()) for p in parts]
    return " ".join(words)


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the department-filtered Mays directory into stubs.

    The filtered listing (``?department=3`` = Management) renders cards that
    link to ``/directory/<slug>/`` with no usable link text, so the name is
    rebuilt from the slug. The unfiltered page is the whole school, which is
    why the generic extractor only kept a couple of strategy names.
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select('a[href*="/directory/"]'):
        href = link.get("href", "")
        slug = href.split("/directory/")[-1]
        if not slug or slug.startswith("?") or len(slug.strip("/")) < 2:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        name = link.get_text(strip=True) or _name_from_slug(slug)
        if not re.search(r"[A-Za-z]", name):
            continue
        stubs.append(FacultyStub(name=name, title=None, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
