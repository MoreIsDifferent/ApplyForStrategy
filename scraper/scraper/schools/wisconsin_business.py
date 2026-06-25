import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://business.wisc.edu"

_SUFFIX = {"ii": "II", "iii": "III", "iv": "IV", "jr": "Jr.", "sr": "Sr."}


def _name_from_slug(slug: str) -> str:
    return " ".join(_SUFFIX.get(p, p.capitalize()) for p in slug.split("-") if p)


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Wisconsin Management & Human Resources faculty page.

    Faculty cards link to ``/directory/<slug>`` with "View profile" as link
    text, so the name is rebuilt from the slug. The page is JS-rendered and
    only surfaced its faculty once fetched with a real browser UA.
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select('a[href*="/directory/"]'):
        href = link.get("href", "")
        slug = href.rstrip("/").rsplit("/", 1)[-1]
        # Skip the filter/landing link (e.g. "?_profile_type=faculty").
        if not slug or "?" in slug or "=" in slug or slug == "directory":
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        name = _name_from_slug(slug)
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
