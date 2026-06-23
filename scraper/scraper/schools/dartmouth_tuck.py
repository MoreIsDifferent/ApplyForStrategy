import re
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from scraper.fetch import fetch_static
from scraper.generic import clean_html_to_text
from scraper.types import FacultyStub, SchoolConfig

BASE_URL = "https://tuck.dartmouth.edu"

# Tuck appends Dartmouth/Tuck class-year designations to many names, e.g.
# "Scott D. Anthony D'96", "Bryan Bollinger D'03, Th'03". Strip the trailing
# run of these so OpenAlex name search isn't polluted. Apostrophe may be a
# curly quote (U+2019).
_CLASS_YEAR_SUFFIX = re.compile(r"\s+(?:[A-Z][a-z]?[’']\d{2})(?:,\s*[A-Z][a-z]?[’']\d{2})*\s*$")


def _clean_name(name: str) -> str:
    return _CLASS_YEAR_SUFFIX.sub("", name).strip()


def parse_faculty_list(soup: BeautifulSoup) -> list[FacultyStub]:
    """Parse the single-page Tuck faculty directory into stubs.

    Faculty link to ``/faculty/faculty-directory/<slug>`` with their name as
    link text. The generic extractor only kept a handful from the ~100-name
    page.
    """
    seen: set[str] = set()
    stubs: list[FacultyStub] = []
    for link in soup.select('a[href*="/faculty/faculty-directory/"]'):
        href = link.get("href", "")
        slug = href.split("/faculty/faculty-directory/")[-1]
        if not slug or slug.startswith("#"):
            continue
        name = _clean_name(link.get_text(strip=True))
        if not name or len(name) < 3:
            continue
        profile_url = urljoin(BASE_URL, href)
        if profile_url in seen:
            continue
        seen.add(profile_url)
        stubs.append(FacultyStub(name=name, title=None, profile_url=profile_url))
    return stubs


def scrape_faculty_list(config: SchoolConfig) -> list[FacultyStub]:
    soup = fetch_static(config.directory_url)
    return parse_faculty_list(soup)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    soup = fetch_static(stub.profile_url)
    return clean_html_to_text(str(soup))
