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


def fetch_works(author_id: str, today: date | None = None) -> list[dict]:
    today = today or date.today()
    author = _get(f"/authors/{author_id}", {})
    works_count = author.get("works_count", 0)

    cutoff = date(today.year - RECENT_YEARS, today.month, today.day).isoformat()
    recent_count_data = _get(
        "/works",
        {
            "filter": f"authorships.author.id:{author_id},from_publication_date:{cutoff}",
            "per_page": 1,
        },
    )
    recent_count = recent_count_data.get("meta", {}).get("count", 0)

    limit = (
        EXPANDED_LIMIT
        if works_count > WORKS_COUNT_THRESHOLD or recent_count >= RECENT_WORKS_THRESHOLD
        else DEFAULT_LIMIT
    )

    recent = _get(
        "/works",
        {"filter": f"authorships.author.id:{author_id}", "sort": "publication_date:desc", "per_page": limit},
    )
    cited = _get(
        "/works",
        {"filter": f"authorships.author.id:{author_id}", "sort": "cited_by_count:desc", "per_page": limit},
    )

    deduped: dict[str, dict] = {}
    for work in recent.get("results", []) + cited.get("results", []):
        parsed = _parse_work(work)
        deduped.setdefault(parsed["openalex_id"], parsed)
    return list(deduped.values())


def _parse_work(work: dict) -> dict:
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}
    return {
        "openalex_id": _short_id(work["id"]),
        "title": work.get("display_name"),
        "year": work.get("publication_year"),
        "journal": source.get("display_name"),
        "citation_count": work.get("cited_by_count"),
        "coauthors": [authorship["author"]["display_name"] for authorship in work.get("authorships", [])],
        "abstract": _reconstruct_abstract(work.get("abstract_inverted_index")),
    }


def _reconstruct_abstract(inverted_index: dict | None) -> str | None:
    if not inverted_index:
        return None
    positions: list[tuple[int, str]] = []
    for word, indexes in inverted_index.items():
        for index in indexes:
            positions.append((index, word))
    positions.sort()
    return " ".join(word for _, word in positions)
