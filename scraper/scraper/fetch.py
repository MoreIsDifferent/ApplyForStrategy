import time

import requests
from bs4 import BeautifulSoup

USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)


def fetch_static(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a static page with requests + BeautifulSoup, with a polite delay."""
    time.sleep(delay)
    response = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    response.raise_for_status()
    return BeautifulSoup(response.text, "html.parser")


def fetch_rendered(url: str, delay: float = 1.0) -> BeautifulSoup:
    """Fetch a JS-rendered page with headless Playwright Chromium."""
    from playwright.sync_api import sync_playwright

    time.sleep(delay)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch()
        page = browser.new_page(user_agent=USER_AGENT)
        page.goto(url, timeout=60000)
        page.wait_for_load_state("networkidle")
        html = page.content()
        browser.close()
    return BeautifulSoup(html, "html.parser")
