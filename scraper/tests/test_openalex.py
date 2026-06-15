from datetime import date
from unittest.mock import MagicMock

from scraper import openalex


def _response(json_data):
    response = MagicMock()
    response.json.return_value = json_data
    response.raise_for_status.return_value = None
    return response


def test_resolve_institution_id_returns_short_id(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {"results": [{"id": "https://openalex.org/I79576946", "display_name": "University of Pennsylvania"}]}
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    result = openalex.resolve_institution_id("Wharton (UPenn)")

    assert result == "I79576946"
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["filter"] == "display_name.search:Wharton (UPenn)"


def test_resolve_institution_id_returns_none_when_no_results(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    assert openalex.resolve_institution_id("Nonexistent University") is None


def test_search_institutions_by_phrase_returns_summaries(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {
                        "id": "https://openalex.org/I61544103",
                        "display_name": "London Business School",
                        "works_count": 5000,
                        "homepage_url": "https://www.london.edu",
                    }
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    results = openalex.search_institutions_by_phrase("London Business School")

    assert results == [
        {
            "id": "I61544103",
            "display_name": "London Business School",
            "works_count": 5000,
            "homepage_url": "https://www.london.edu",
        }
    ]
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["filter"] == "display_name.search:London Business School"


def test_search_institutions_returns_summaries(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {
                        "id": "https://openalex.org/I136199984",
                        "display_name": "Harvard University",
                        "works_count": 500000,
                        "homepage_url": "https://www.harvard.edu",
                    }
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    results = openalex.search_institutions("Harvard")

    assert results == [
        {
            "id": "I136199984",
            "display_name": "Harvard University",
            "works_count": 500000,
            "homepage_url": "https://www.harvard.edu",
        }
    ]
    _, kwargs = mock_get.call_args
    assert kwargs["params"]["search"] == "Harvard"


def test_search_institutions_returns_empty_list_when_no_results(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    assert openalex.search_institutions("Nonexistent University Xyzzy") == []


def test_find_author_returns_match_when_single_candidate(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {"results": [{"id": "https://openalex.org/A5081922410", "display_name": "Michael E. Porter"}]}
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Michael Porter", "I136199984")

    assert author_id == "A5081922410"
    assert confidence == "name_institution"


def test_find_author_ambiguous_when_multiple_candidates(monkeypatch):
    mock_get = MagicMock(
        return_value=_response(
            {
                "results": [
                    {"id": "https://openalex.org/A1", "display_name": "Jane Doe"},
                    {"id": "https://openalex.org/A2", "display_name": "Jane Doe"},
                ]
            }
        )
    )
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", "I79576946")

    assert author_id is None
    assert confidence == "ambiguous"


def test_find_author_ambiguous_when_zero_candidates(monkeypatch):
    mock_get = MagicMock(return_value=_response({"results": []}))
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", "I79576946")

    assert author_id is None
    assert confidence == "ambiguous"


def test_find_author_ambiguous_when_no_institution_id(monkeypatch):
    mock_get = MagicMock()
    monkeypatch.setattr(openalex.requests, "get", mock_get)

    author_id, confidence = openalex.find_author("Jane Doe", None)

    assert author_id is None
    assert confidence == "ambiguous"
    mock_get.assert_not_called()


def _work(openalex_id, title, year, journal, citations, coauthors, abstract_words=None):
    abstract_inverted_index = None
    if abstract_words:
        abstract_inverted_index = {word: [i] for i, word in enumerate(abstract_words)}
    return {
        "id": f"https://openalex.org/{openalex_id}",
        "display_name": title,
        "publication_year": year,
        "cited_by_count": citations,
        "primary_location": {"source": {"display_name": journal}} if journal else None,
        "authorships": [{"author": {"display_name": coauthor}} for coauthor in coauthors],
        "abstract_inverted_index": abstract_inverted_index,
    }


def test_fetch_works_dedupes_and_reconstructs_abstract(monkeypatch):
    shared = _work("W1", "Shared Paper", 2024, "Strategic Management Journal", 50, ["Author A", "Author B"], ["This", "is", "abstract"])
    recent_only = _work("W2", "Recent Paper", 2025, "Org Science", 5, ["Author A"], None)
    cited_only = _work("W3", "Cited Paper", 2010, "AMJ", 500, ["Author A"], None)

    def fake_get(url, params=None, headers=None, timeout=None):
        if "/authors/" in url:
            return _response({"works_count": 10})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 0}})
        if params.get("sort") == "publication_date:desc":
            return _response({"results": [recent_only, shared]})
        if params.get("sort") == "cited_by_count:desc":
            return _response({"results": [cited_only, shared]})
        raise AssertionError(f"unexpected request: {url} {params}")

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    works = openalex.fetch_works("A123", today=date(2026, 1, 1))

    ids = {w["openalex_id"] for w in works}
    assert ids == {"W1", "W2", "W3"}

    shared_result = next(w for w in works if w["openalex_id"] == "W1")
    assert shared_result["title"] == "Shared Paper"
    assert shared_result["year"] == 2024
    assert shared_result["journal"] == "Strategic Management Journal"
    assert shared_result["citation_count"] == 50
    assert shared_result["coauthors"] == ["Author A", "Author B"]
    assert shared_result["abstract"] == "This is abstract"

    cited_only_result = next(w for w in works if w["openalex_id"] == "W3")
    assert cited_only_result["journal"] == "AMJ"
    assert cited_only_result["abstract"] is None


def test_fetch_works_uses_default_limit_for_typical_author(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 10})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 1}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert len(sort_calls) == 2
    assert all(params["per_page"] == 10 for params in sort_calls)


def test_fetch_works_expands_limit_for_prolific_author(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 31})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 0}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert all(params["per_page"] == 20 for params in sort_calls)


def test_fetch_works_expands_limit_for_rising_star(monkeypatch):
    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append((url, params))
        if "/authors/" in url:
            return _response({"works_count": 5})
        if "from_publication_date" in params["filter"]:
            return _response({"meta": {"count": 3}})
        return _response({"results": []})

    monkeypatch.setattr(openalex.requests, "get", MagicMock(side_effect=fake_get))

    openalex.fetch_works("A123", today=date(2026, 1, 1))

    sort_calls = [params for _, params in calls if "sort" in params]
    assert all(params["per_page"] == 20 for params in sort_calls)
