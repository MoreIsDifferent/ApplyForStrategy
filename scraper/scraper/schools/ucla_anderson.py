from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered, fetch_static
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.anderson.ucla.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the UCLA Anderson Management & Organizations faculty directory.

    Each faculty member is rendered as an ``<article class="card-body">``
    containing a ``<header class="profile-name">`` with the name, an
    optional title field, and a ``<a class="card--person">`` link to the
    "Read Bio" profile page.
    """
    stubs = []
    seen_urls = set()
    for card in soup.select("article.card-body"):
        name_header = card.select_one(".profile-name")
        link = card.select_one("a.card--person")
        if name_header is None or link is None:
            continue

        href = link.get("href")
        if not href:
            continue

        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)

        name = name_header.get_text(" ", strip=True)
        if not name:
            continue

        title_el = card.select_one(
            ".person__field-display-title, .person__field-short-title"
        )
        title = title_el.get_text(" ", strip=True) if title_el else None

        stubs.append(FacultyStub(name=name, title=title or None, profile_url=profile_url))
    return stubs


def parse_bio(soup: BeautifulSoup) -> str:
    """Extract the biography text from a UCLA Anderson faculty profile page.

    Profile pages render a tabbed layout; the "Biography" tab content lives
    in ``#pane-tab-biography .tab-item__field-text``.
    """
    container = soup.select_one("#pane-tab-biography .tab-item__field-text")
    if container is None:
        container = soup.select_one(".faculty-bio-profile")
    if container is None:
        container = soup

    paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    return "\n\n".join(p for p in paragraphs if p)


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    fetcher = fetch_static if config.fetch_mode == "static" else fetch_rendered
    soup = fetcher(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    fetcher = fetch_static if config.fetch_mode == "static" else fetch_rendered
    soup = fetcher(stub.profile_url)
    return parse_bio(soup)
