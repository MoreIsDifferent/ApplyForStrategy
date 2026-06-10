from pathlib import Path

from bs4 import BeautifulSoup

from scraper.schools.wharton import parse_bio, parse_faculty_list

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def _load_fixture(name: str) -> BeautifulSoup:
    html = (FIXTURES_DIR / name).read_text()
    return BeautifulSoup(html, "html.parser")


def test_parse_faculty_list_returns_stubs_with_absolute_urls():
    soup = _load_fixture("wharton_directory.html")

    stubs = parse_faculty_list(soup)

    assert len(stubs) > 0
    for stub in stubs:
        assert stub.name
        assert stub.profile_url.startswith("https://mgmt.wharton.upenn.edu")


def test_parse_bio_extracts_nonempty_text():
    soup = _load_fixture("wharton_profile_sample.html")

    bio = parse_bio(soup)

    assert isinstance(bio, str)
    assert len(bio.strip()) > 50
