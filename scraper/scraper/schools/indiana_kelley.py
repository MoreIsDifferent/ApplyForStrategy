from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

# Profile links in the chunk markup are relative to the faculty-directory path.
PROFILE_BASE = "https://kelley.iu.edu/faculty-research/faculty-directory/"

# The visible directory paginates via JS that pulls HTML chunks from this PHP
# endpoint. department=56 is Management & Entrepreneurship; page is 1-indexed.
CHUNK_URL = (
    "https://kelley.iu.edu/_assets/php/faculty-chunk.php"
    "?search=true&classification=0&classval=All%20Classifications"
    "&department=56&program=0&searchText=&page="
)
MAX_PAGES = 30


def parse_faculty_chunk(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse one faculty-chunk.php page into stubs.

    Each card links to ``profile.html?id=<username>`` with the person's name
    as the link text.
    """
    stubs: list[FacultyStub] = []
    seen: set[str] = set()
    for link in soup.select('a[href*="profile.html?id="]'):
        href = link.get("href", "")
        name = link.get_text(strip=True)
        if not href or not name:
            continue
        profile_url = urljoin(PROFILE_BASE, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        stubs.append(FacultyStub(name=name, title=None, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    all_stubs: list[FacultyStub] = []
    seen: set[str] = set()
    for page in range(1, MAX_PAGES + 1):
        soup = fetch_static(f"{CHUNK_URL}{page}")
        page_stubs = parse_faculty_chunk(soup)
        new = [s for s in page_stubs if s.profile_url not in seen]
        if not new:
            break
        for s in new:
            seen.add(s.profile_url)
        all_stubs.extend(new)
    return all_stubs


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_static(stub.profile_url)
    return clean_html_to_text(str(soup))
