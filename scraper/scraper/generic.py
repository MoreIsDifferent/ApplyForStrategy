import trafilatura
from bs4 import BeautifulSoup

from scraper.extract import extract_faculty_list
from scraper.fetch import fetch_rendered, fetch_static
from scraper.types import FacultyStub, SchoolConfig

BOILERPLATE_TAGS = ["script", "style", "nav", "footer", "header", "noscript"]

# If trafilatura's main-content extraction keeps less than this fraction of the
# raw-text extraction, assume it over-pruned (common on faculty directory grids)
# and fall back to the raw extraction instead.
RAW_FALLBACK_RATIO = 0.5


def _extract_raw_text(html: str) -> str:
    """Strip obvious boilerplate tags and return text with inline markdown links."""
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(BOILERPLATE_TAGS):
        tag.decompose()
    for a in soup.find_all("a"):
        href = a.get("href")
        link_text = a.get_text(strip=True)
        if href and link_text:
            a.replace_with(f"[{link_text}]({href})")
    lines = (line.strip() for line in soup.get_text(separator="\n").splitlines())
    return "\n".join(line for line in lines if line)


def clean_html_to_text(html: str) -> str:
    """Strip boilerplate (nav, footer, ads) and return clean markdown text, preserving links.

    Falls back to a simpler raw-text extraction when trafilatura's main-content
    heuristic discards most of the page, which happens on faculty directory grids
    that it mistakes for navigation/listing boilerplate.
    """
    text = trafilatura.extract(html, include_links=True, output_format="markdown") or ""
    raw_text = _extract_raw_text(html)
    if len(text) < len(raw_text) * RAW_FALLBACK_RATIO:
        return raw_text
    return text


def _fetch_html(url: str, fetch_mode: str) -> str:
    soup = fetch_rendered(url) if fetch_mode == "rendered" else fetch_static(url)
    return str(soup)


def scrape_faculty_list(config: SchoolConfig, client, model: str) -> list[FacultyStub]:
    html = _fetch_html(config.directory_url, config.fetch_mode)
    text = clean_html_to_text(html)
    return extract_faculty_list(text, config.area_hint or "", config.directory_url, client, model)


def scrape_bio(config: SchoolConfig, stub: FacultyStub) -> str:
    html = _fetch_html(stub.profile_url, config.fetch_mode)
    return clean_html_to_text(html)
