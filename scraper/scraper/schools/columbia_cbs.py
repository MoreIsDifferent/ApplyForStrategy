from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://business.columbia.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Columbia areas-of-expertise faculty grid into stubs.

    The strategy area page renders a ``.faculty-grid--by-aoe`` grid whose
    ``.m-listing-faculty`` cards each hold an overlay link
    (``.m-listing-faculty__link``), a name (``.m-listing-faculty__title``)
    and the first title line (``.m-detail-meta__item-title``). The generic
    LLM extractor only recovered one of these because the surrounding page
    is dominated by "Latest on Strategy" article cards.
    """
    grid = soup.select_one(".faculty-grid--by-aoe")
    if grid is None:
        return []

    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for card in grid.select(".m-listing-faculty"):
        link = card.select_one(".m-listing-faculty__link")
        if link is None or not link.get("href"):
            continue
        profile_url = urljoin(BASE_URL, link["href"])
        if profile_url in seen:
            continue
        seen.add(profile_url)

        name_el = card.select_one(".m-listing-faculty__title")
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            continue

        title_el = card.select_one(".m-detail-meta__item-title")
        title = title_el.get_text(strip=True) if title_el else None

        stubs.append(FacultyStub(name=name, title=title, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
