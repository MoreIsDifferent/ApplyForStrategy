from unittest.mock import MagicMock

import pytest

from scraper import openalex


@pytest.fixture(autouse=True)
def no_polite_sleep(monkeypatch):
    monkeypatch.setattr(openalex.time, "sleep", MagicMock())
