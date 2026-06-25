from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://business.rice.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Rice Strategy & Environment area page into stubs.

    The area page is JS-rendered into ``.c--profile-card`` cards, each with a
    ``/person/<slug>`` link bearing the name and a ``.f--field.f--text`` title.
    The generic static fetch saw none of this (empty shell), hence 0 faculty.
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for card in soup.select(".c--profile-card"):
        link = card.select_one('a[href*="/person/"]')
        if link is None or not link.get("href"):
            continue
        profile_url = urljoin(BASE_URL, link["href"])
        if profile_url in seen:
            continue
        seen.add(profile_url)
        # Name lives on the text-bearing anchor (a sibling image anchor is empty).
        name = ""
        for a in card.select('a[href*="/person/"]'):
            t = a.get_text(strip=True)
            if t:
                name = t
                break
        if not name:
            name = link["href"].rstrip("/").rsplit("/", 1)[-1].replace("-", " ").title()
        title_el = card.select_one(".f--field.f--text")
        title = title_el.get_text(strip=True) if title_el else None
        stubs.append(FacultyStub(name=name, title=title, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
