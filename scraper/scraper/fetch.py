import re
import time

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)

LOAD_MORE_PATTERN = re.compile(r"load more|show more|view more|see more", re.IGNORECASE)

MAX_SCROLL_ITERATIONS = 10


def fetch_static(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a static page with requests + BeautifulSoup, with a polite delay."""
    time.sleep(delay)
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


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
    from playwright.sync_api import sync_playwright

    time.sleep(delay)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(url, timeout=60000)
        page.wait_for_load_state("networkidle")

        previous_height = None
        for _ in range(MAX_SCROLL_ITERATIONS):
            clicked = _click_load_more(page)
            page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            page.wait_for_load_state("networkidle")
            current_height = page.evaluate("document.body.scrollHeight")
            if current_height == previous_height and not clicked:
                break
            previous_height = current_height

        html = page.content()
        browser.close()
    return BeautifulSoup(html, "html.parser")
