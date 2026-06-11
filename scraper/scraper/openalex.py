import os
from datetime import date

import requests

BASE_URL = "https://api.openalex.org"
USER_AGENT = (
    "StrategyPhDFacultyFinderBot/0.1 "
    "(+https://github.com/MoreIsDifferent/ApplyForStrategy; research project)"
)

DEFAULT_LIMIT = 10
EXPANDED_LIMIT = 20
WORKS_COUNT_THRESHOLD = 30
RECENT_YEARS = 3
RECENT_WORKS_THRESHOLD = 3


def _get(path: str, params: dict) -> dict:
    params = dict(params)
    params["mailto"] = os.environ.get("OPENALEX_EMAIL", "phd-finder@example.com")
    response = requests.get(
        f"{BASE_URL}{path}", params=params, headers={"User-Agent": USER_AGENT}, timeout=30
    )
    response.raise_for_status()
    return response.json()


def _short_id(openalex_url: str) -> str:
    return openalex_url.rsplit("/", 1)[-1]


def resolve_institution_id(school_name: str) -> str | None:
    data = _get("/institutions", {"filter": f"display_name.search:{school_name}", "per_page": 1})
    results = data.get("results") or []
    if not results:
        return None
    return _short_id(results[0]["id"])


def find_author(name: str, institution_id: str | None) -> tuple[str | None, str]:
    if institution_id is None:
        return None, "ambiguous"

    filter_str = f"display_name.search:{name},affiliations.institution.id:{institution_id}"
    data = _get("/authors", {"filter": filter_str, "per_page": 25})
    results = data.get("results") or []
    if len(results) != 1:
        return None, "ambiguous"
    return _short_id(results[0]["id"]), "name_institution"
