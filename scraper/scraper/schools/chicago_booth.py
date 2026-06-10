from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_rendered
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://www.chicagobooth.edu"


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the Chicago Booth Strategy and Leadership faculty listing.

    The directory page is rendered by a Coveo search widget. Each faculty
    member appears as a ``div.coveo-card-layout.CoveoResult`` containing a
    ``div.copy`` with an ``<h2><a>Name</a></h2>`` and a ``<p>Title</p>``.
    """
    stubs = []
    seen_urls = set()
    for result in soup.select("div.coveo-card-layout.CoveoResult"):
        link = result.select_one(".copy h2 a")
        if link is None:
            continue

        href = link.get("href")
        if not href:
            continue

        name = link.get_text(strip=True)
        if not name:
            continue

        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen_urls:
            continue
        seen_urls.add(profile_url)

        title_el = result.select_one(".copy p")
        title = title_el.get_text(strip=True) if title_el else None

        stubs.append(FacultyStub(name=name, title=title or None, profile_url=profile_url))
    return stubs


def parse_bio(soup: BeautifulSoup) -> str:
    """Extract the biography text from a Chicago Booth faculty profile page.

    The "Biography" section is the first ``div.body-copy.copy-container``
    inside a ``.body-copy-module`` whose heading reads "Biography".
    """
    container = None
    for module in soup.select(".body-copy-module"):
        heading = module.find(["h1", "h2", "h3", "h4"])
        if heading and heading.get_text(strip=True).lower() == "biography":
            container = module.select_one(".body-copy.copy-container")
            break

    if container is None:
        container = soup.select_one(".body-copy.copy-container")

    if container is None:
        container = soup

    paragraphs = [p.get_text(" ", strip=True) for p in container.find_all("p")]
    return "\n\n".join(p for p in paragraphs if p)


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_rendered(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_rendered(stub.profile_url)
    return parse_bio(soup)
