from pathlib import Path

from scraper.config import load_school_configs
from scraper.types import SchoolConfig

FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_load_school_configs():
    configs = load_school_configs(FIXTURES_DIR / "sample_schools.yaml")

    assert configs == [
        SchoolConfig(
            slug="test-school",
            name="Test School",
            directory_url="https://example.edu/faculty",
            fetch_mode="static",
        )
    ]
