from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.marshall.usc.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the MOR-filtered faculty directory into stubs.

    The filtered directory page (``?department=882``) renders a ``<ul
    id="people-list-dest">`` whose ``<li>`` elements each contain one ``<a>``
    link with an ``<h3 class="title">`` name and ``<div class="subtitle">``
    title elements inside.
    """
    people_list = soup.find(id="people-list-dest")
    if people_list is None:
        return []

    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for a in people_list.find_all("a", href=True):
        profile_url = urljoin(BASE_URL, a["href"])
        if profile_url in seen:
            continue
        seen.add(profile_url)

        name_el = a.find(class_="title")
        name = name_el.get_text(strip=True) if name_el else a.get_text(strip=True).split("\n")[0].strip()
        if not name:
            continue

        title_els = a.find_all(class_="subtitle")
        title = title_els[0].get_text(strip=True) if title_els else None

        stubs.append(FacultyStub(name=name, title=title, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
