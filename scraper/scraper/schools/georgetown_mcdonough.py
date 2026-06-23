from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://msb.georgetown.edu"

# Some faculty link out to Georgetown's Salesforce-backed faculty360 directory
# instead of an MSB profile page. Those are single-page-app contact records
# with no scrapeable bio, so we skip fetching them for bio text.
EXTERNAL_PROFILE_HOST = "gufaculty360.georgetown.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the McDonough area page faculty cards into stubs.

    The SEEPP area page lists every affiliated faculty member as an
    ``<a class="gu-block-profile-link">`` whose text is the person's name.
    The generic LLM extractor only recovered a few because the long
    area-description preamble dominated the page text.
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select("a.gu-block-profile-link"):
        href = link.get("href")
        name = link.get_text(strip=True)
        if not href or not name:
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
    if EXTERNAL_PROFILE_HOST in stub.profile_url:
        return ""
    soup = fetch_rendered(stub.profile_url)
    return clean_html_to_text(str(soup))
