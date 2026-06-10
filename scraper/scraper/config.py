from pathlib import Path

import yaml

from scraper.types import SchoolConfig


def load_school_configs(path: Path) -> list[SchoolConfig]:
    with open(path) as f:
        data = yaml.safe_load(f)
    return [SchoolConfig(**entry) for entry in data]
