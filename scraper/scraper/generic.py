import trafilatura

from scraper.extract import extract_faculty_list
from scraper.fetch import fetch_rendered, fetch_static
from scraper.types import FacultyStub, SchoolConfig


def clean_html_to_text(html: str) -> str:
    """Strip boilerplate (nav, footer, ads) and return clean markdown text, preserving links."""
    return trafilatura.extract(html, include_links=True, output_format="markdown") or ""


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
