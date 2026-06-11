from pathlib import Path
from unittest.mock import MagicMock

from bs4 import BeautifulSoup

from scraper.generic import clean_html_to_text, scrape_bio, scrape_faculty_list
from scraper.types import FacultyStub, SchoolConfig

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "generic"


def test_clean_html_to_text_keeps_main_content_and_links():
    html = (FIXTURES_DIR / "sample_directory.html").read_text()

    text = clean_html_to_text(html)

    assert "[Jane Doe](/faculty/jane-doe)" in text
    assert "[John Smith](/faculty/john-smith)" in text


def test_clean_html_to_text_drops_nav_and_footer():
    html = (FIXTURES_DIR / "sample_directory.html").read_text()

    text = clean_html_to_text(html)

    assert "Copyright" not in text
    assert "Privacy Policy" not in text


def test_clean_html_to_text_falls_back_to_raw_extraction_when_trafilatura_is_sparse(monkeypatch):
    html = (FIXTURES_DIR / "directory_grid.html").read_text()
    monkeypatch.setattr("scraper.generic.trafilatura.extract", MagicMock(return_value="short"))

    text = clean_html_to_text(html)

    assert "[Jane Doe](/faculty/jane-doe)" in text
    assert "[John Smith](/faculty/john-smith)" in text
    assert "[Alex Lee](/faculty/alex-lee)" in text
    assert "Copyright" not in text


def _config(fetch_mode="static"):
    return SchoolConfig(
        slug="example",
        name="Example University",
        directory_url="https://example.edu/faculty",
        fetch_mode=fetch_mode,
        area_hint="Strategy and Strategic Management faculty",
    )


def test_scrape_faculty_list_fetches_cleans_and_extracts(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_static = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_static", fetch_static)

    expected = [FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty/jane-doe")]
    extract_faculty_list = MagicMock(return_value=expected)
    monkeypatch.setattr("scraper.generic.extract_faculty_list", extract_faculty_list)

    client = MagicMock()
    config = _config()

    result = scrape_faculty_list(config, client, "test-model")

    assert result == expected
    fetch_static.assert_called_once_with(config.directory_url)

    call_args = extract_faculty_list.call_args[0]
    cleaned_text, area_hint, base_url, passed_client, passed_model = call_args
    assert "[Jane Doe](/faculty/jane-doe)" in cleaned_text
    assert area_hint == "Strategy and Strategic Management faculty"
    assert base_url == config.directory_url
    assert passed_client is client
    assert passed_model == "test-model"


def test_scrape_faculty_list_uses_rendered_fetch_when_configured(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_rendered = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_rendered", fetch_rendered)
    monkeypatch.setattr("scraper.generic.extract_faculty_list", MagicMock(return_value=[]))

    config = _config(fetch_mode="rendered")

    scrape_faculty_list(config, MagicMock(), "test-model")

    fetch_rendered.assert_called_once_with(config.directory_url)


def test_scrape_bio_fetches_and_cleans(monkeypatch):
    html = (FIXTURES_DIR / "sample_directory.html").read_text()
    soup = BeautifulSoup(html, "html.parser")

    fetch_static = MagicMock(return_value=soup)
    monkeypatch.setattr("scraper.generic.fetch_static", fetch_static)

    config = _config()
    stub = FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty/jane-doe")

    bio_text = scrape_bio(config, stub)

    fetch_static.assert_called_once_with(stub.profile_url)
    assert "[Jane Doe](/faculty/jane-doe)" in bio_text
