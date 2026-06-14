import re
import socket
import time

import requests
import urllib3.util.connection
from bs4 import BeautifulSoup

# Some university hosts advertise IPv6 addresses that are unreachable from
# this network, leaving connections stuck in SYN_SENT well past any
# configured timeout. Prefer IPv4 to avoid those hangs.
urllib3.util.connection.allowed_gai_family = lambda: socket.AF_INET

USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)

REQUEST_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

LOAD_MORE_PATTERN = re.compile(
    r"^(load|show|view|see)\s+more\b|^more\s+(faculty|results|profiles|people|staff|articles|posts)\b",
    re.IGNORECASE,
)

COOKIE_CONSENT_PATTERN = re.compile(r"^(accept|allow)\s+all\b|^accept\b", re.IGNORECASE)

MAX_SCROLL_ITERATIONS = 10


def fetch_static(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a static page with requests + BeautifulSoup, with a polite delay.

    Some university sites serve an incomplete certificate chain that fails
    verification with Python's bundled CA store even though browsers accept
    it (they fetch the missing intermediate via AIA). Retry without
    verification in that case - the content being scraped is public.
    """
    time.sleep(delay)
    try:
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=30)
    except requests.exceptions.SSLError:
        from urllib3.exceptions import InsecureRequestWarning

        requests.packages.urllib3.disable_warnings(InsecureRequestWarning)
        response = requests.get(url, headers=REQUEST_HEADERS, timeout=30, verify=False)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def _dismiss_cookie_banner(page, click_timeout: float = 5000) -> None:
    """Click an "Accept All"-style cookie consent button, if present.

    Cookie banners can sit on top of "Load More" buttons and block clicks.
    Failures are swallowed - if there's no banner (or it can't be dismissed),
    fetching proceeds as normal.
    """
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

    for element in page.get_by_role("button", name=COOKIE_CONSENT_PATTERN).all():
        if element.is_visible():
            try:
                element.click(timeout=click_timeout)
            except PlaywrightTimeoutError:
                continue


def _click_load_more(page, click_timeout: float = 5000) -> bool:
    """Click any visible 'Load More'-style buttons/links. Returns True if anything was clicked.

    Click failures (e.g. element obscured by an overlay) are swallowed - a
    "Load More" button that can't be clicked shouldn't crash the whole fetch.
    """
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError

    clicked = False
    for role in ("button", "link"):
        for element in page.get_by_role(role, name=LOAD_MORE_PATTERN).all():
            if element.is_visible():
                try:
                    element.click(timeout=click_timeout)
                    clicked = True
                except PlaywrightTimeoutError:
                    continue
    return clicked


def fetch_rendered(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a JS-rendered page with headless Playwright Chromium.

    After the initial load, repeatedly clicks "Load More"-style buttons and
    scrolls to the bottom until the page height stabilizes, to surface content
    loaded via pagination or infinite scroll.
    """
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
    from playwright.sync_api import sync_playwright

    def _wait_idle(page) -> None:
        # Some pages (e.g. those with chat widgets or analytics polling) never
        # go fully idle. Treat that as "good enough" rather than failing the
        # whole fetch.
        try:
            page.wait_for_load_state("networkidle")
        except PlaywrightTimeoutError:
            pass

    time.sleep(delay)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(url, timeout=60000)
        _wait_idle(page)
        _dismiss_cookie_banner(page)

        previous_height = None
        for _ in range(MAX_SCROLL_ITERATIONS):
            clicked = _click_load_more(page)
            page.evaluate("document.body && window.scrollTo(0, document.body.scrollHeight)")
            _wait_idle(page)
            current_height = page.evaluate("document.body ? document.body.scrollHeight : 0")
            if current_height == previous_height and not clicked:
                break
            previous_height = current_height

        html = page.content()
        browser.close()
    return BeautifulSoup(html, "html.parser")
