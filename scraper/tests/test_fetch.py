from unittest.mock import MagicMock, patch

from scraper.fetch import fetch_rendered, fetch_static


@patch("scraper.fetch.requests.get")
@patch("scraper.fetch.time.sleep")
def test_fetch_static_returns_soup(mock_sleep, mock_get):
    mock_response = MagicMock()
    mock_response.text = "<html><body><h1>Hello</h1></body></html>"
    mock_response.raise_for_status = MagicMock()
    mock_get.return_value = mock_response

    soup = fetch_static("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Hello"
    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["headers"]["User-Agent"].startswith(
        "StrategyPhDFacultyFinderBot"
    )


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_returns_soup(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"

    mock_browser = MagicMock()
    mock_browser.new_page.return_value = mock_page

    mock_chromium = MagicMock()
    mock_chromium.launch.return_value = mock_browser

    mock_playwright_instance = MagicMock()
    mock_playwright_instance.chromium = mock_chromium

    mock_playwright_cm = MagicMock()
    mock_playwright_cm.__enter__.return_value = mock_playwright_instance
    mock_playwright_cm.__exit__.return_value = None

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        soup = fetch_rendered("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Rendered"
    mock_page.goto.assert_called_once_with("https://example.edu/faculty", timeout=60000)
