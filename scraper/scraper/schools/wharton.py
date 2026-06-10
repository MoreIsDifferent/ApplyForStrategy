from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.wharton.upenn.edu"

# Profile links for Management department faculty live on this subdomain.
MGMT_PROFILE_HOST = "https://mgmt.wharton.upenn.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Wharton faculty directory into Management department stubs.

    The directory page lists faculty from every Wharton department as
    ``<a title="Name | Title, Affiliation">`` elements. Management faculty
    are identified by their profile link pointing at the
    ``mgmt.wharton.upenn.edu`` subdomain.
    """
    stubs = []
    seen_urls = set()
    for link in soup.select("a[title]"):
        title_attr = link.get("title", "")
        if "|" not in title_attr:
            continue

        href = link.get("href")
        if not href:
            continue

        profile_url = urljoin(BASE_URL, href)
        if not profile_url.startswith(MGMT_PROFILE_HOST):
            continue

        name_part, _, rest = title_attr.partition("|")
        name = name_part.strip()
        title = rest.strip() or None
        if not name:
            continue

        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)

        stubs.append(FacultyStub(name=name, title=title, profile_url=profile_url))
    return stubs


def parse_bio(soup: BeautifulSoup) -> str:
    """Extract the biography/overview text from a Wharton faculty profile page."""
    container = soup.select_one(".wfp-tabbed-navigation-section--overview")
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
