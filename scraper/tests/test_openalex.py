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
