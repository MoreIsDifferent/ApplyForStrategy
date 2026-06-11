from pathlib import Path

from scraper.generic import clean_html_to_text

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
