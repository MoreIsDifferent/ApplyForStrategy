from unittest.mock import MagicMock, patch

from scraper.fetch import LOAD_MORE_PATTERN, fetch_rendered, fetch_static


def test_load_more_pattern_matches_common_button_labels():
    for label in ["Load More", "Show more", "View More", "See more", "More Faculty", "More Results"]:
        assert LOAD_MORE_PATTERN.search(label), label


def test_load_more_pattern_does_not_match_unrelated_labels():
    for label in ["More information", "Read about us", "Learn more about Strategy"]:
        assert not LOAD_MORE_PATTERN.search(label), label


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


def _empty_locator():
    locator = MagicMock()
    locator.all.return_value = []
    return locator


def _mock_playwright_page(page):
    mock_browser = MagicMock()
    mock_browser.new_page.return_value = page

    mock_chromium = MagicMock()
    mock_chromium.launch.return_value = mock_browser

    mock_playwright_instance = MagicMock()
    mock_playwright_instance.chromium = mock_chromium

    mock_playwright_cm = MagicMock()
    mock_playwright_cm.__enter__.return_value = mock_playwright_instance
    mock_playwright_cm.__exit__.return_value = None
    return mock_playwright_cm


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_returns_soup(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"
    mock_page.get_by_role.return_value = _empty_locator()
    mock_page.evaluate.return_value = 1000

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        soup = fetch_rendered("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Rendered"
    mock_page.goto.assert_called_once_with("https://example.edu/faculty", timeout=60000)


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_scrolls_until_height_stabilizes(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"
    mock_page.get_by_role.return_value = _empty_locator()
    # scrollTo calls return None, scrollHeight checks grow then stabilize
    mock_page.evaluate.side_effect = [None, 1000, None, 2000, None, 2000]

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        fetch_rendered("https://example.edu/faculty", delay=0)

    # initial load + 3 scroll iterations before height stabilizes
    assert mock_page.wait_for_load_state.call_count == 4


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_clicks_load_more_buttons(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"

    mock_button = MagicMock()
    mock_button.is_visible.return_value = True
    locator_with_button = MagicMock()
    locator_with_button.all.return_value = [mock_button]

    mock_page.get_by_role.side_effect = [
        _empty_locator(),  # cookie banner dismissal check
        locator_with_button,  # iteration 1: button role has a "Load More" button
        _empty_locator(),  # iteration 1: link role
        _empty_locator(),  # iteration 2: button role
        _empty_locator(),  # iteration 2: link role
    ]
    mock_page.evaluate.side_effect = [None, 1000, None, 1000]

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        fetch_rendered("https://example.edu/faculty", delay=0)

    mock_button.click.assert_called_once()


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_dismisses_cookie_banner(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"

    mock_accept_button = MagicMock()
    mock_accept_button.is_visible.return_value = True
    locator_with_accept = MagicMock()
    locator_with_accept.all.return_value = [mock_accept_button]

    mock_page.get_by_role.side_effect = [
        locator_with_accept,  # cookie banner dismissal check
        _empty_locator(),  # iteration 1: button role
        _empty_locator(),  # iteration 1: link role
        _empty_locator(),  # iteration 2: button role
        _empty_locator(),  # iteration 2: link role
    ]
    mock_page.evaluate.return_value = 1000

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        fetch_rendered("https://example.edu/faculty", delay=0)

    mock_accept_button.click.assert_called_once()


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_ignores_load_more_buttons_that_fail_to_click(mock_sleep):
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"

    mock_button = MagicMock()
    mock_button.is_visible.return_value = True
    mock_button.click.side_effect = PlaywrightTimeoutError("Timeout 5000ms exceeded")
    locator_with_button = MagicMock()
    locator_with_button.all.return_value = [mock_button]

    mock_page.get_by_role.return_value = locator_with_button
    mock_page.evaluate.return_value = 1000

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        soup = fetch_rendered("https://example.edu/faculty", delay=0)

    assert soup.find("h1").text == "Rendered"


@patch("scraper.fetch.time.sleep")
def test_fetch_rendered_stops_after_max_iterations(mock_sleep):
    mock_page = MagicMock()
    mock_page.content.return_value = "<html><body><h1>Rendered</h1></body></html>"
    mock_page.get_by_role.return_value = _empty_locator()
    # height keeps growing forever - loop must still terminate
    mock_page.evaluate.side_effect = lambda script: len(mock_page.evaluate.mock_calls) * 1000

    mock_playwright_cm = _mock_playwright_page(mock_page)

    with patch("playwright.sync_api.sync_playwright", return_value=mock_playwright_cm):
        fetch_rendered("https://example.edu/faculty", delay=0)

    # initial load + MAX_SCROLL_ITERATIONS loop iterations
    assert mock_page.wait_for_load_state.call_count == 11
