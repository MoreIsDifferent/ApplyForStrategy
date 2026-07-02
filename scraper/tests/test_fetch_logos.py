from scraper.fetch_logos import (
    domain_from_url,
    extract_icon_url,
    favicon_fallback_url,
    extension_for,
    render_generated_map,
)


def test_domain_from_url_strips_scheme_and_path():
    assert domain_from_url("https://www.hbs.edu/faculty") == "www.hbs.edu"


def test_extract_icon_prefers_largest_apple_touch_icon():
    html = """
    <html><head>
      <link rel="icon" href="/favicon.ico">
      <link rel="apple-touch-icon" sizes="120x120" href="/small.png">
      <link rel="apple-touch-icon" sizes="180x180" href="/big.png">
    </head></html>
    """
    assert extract_icon_url(html, "https://x.edu") == "https://x.edu/big.png"


def test_extract_icon_falls_back_to_sized_icon_when_no_apple_touch():
    html = '<link rel="icon" sizes="192x192" href="https://x.edu/i.png">'
    assert extract_icon_url(html, "https://x.edu") == "https://x.edu/i.png"


def test_extract_icon_returns_none_when_no_usable_link():
    assert extract_icon_url("<html><head></head></html>", "https://x.edu") is None


def test_favicon_fallback_url_uses_google_service():
    url = favicon_fallback_url("www.hbs.edu")
    assert url == "https://www.google.com/s2/favicons?domain=www.hbs.edu&sz=128"


def test_extension_for_maps_content_type():
    assert extension_for("image/png", "https://x/y") == ".png"
    assert extension_for("image/jpeg", "https://x/y") == ".jpg"
    assert extension_for("image/svg+xml", "https://x/y") == ".svg"


def test_extension_for_falls_back_to_url_suffix():
    assert extension_for("application/octet-stream", "https://x/logo.ico") == ".ico"


def test_render_generated_map_sorts_and_formats():
    out = render_generated_map({"wharton": "wharton.jpeg", "mit-sloan": "mit-sloan.png"})
    assert "export const GENERATED_SCHOOL_ICONS" in out
    assert out.index("mit-sloan") < out.index("wharton")  # sorted
    assert "'mit-sloan': '/school-icons/mit-sloan.png'" in out
