import json
from unittest.mock import MagicMock

import pytest

from scraper.extract import ExtractionError, extract_faculty_fields, extract_faculty_list
from scraper.types import ExtractedFields, FacultyStub


def _mock_response(content: dict) -> MagicMock:
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=json.dumps(content)))]
    return response


def test_short_bio_skips_llm_call():
    client = MagicMock()

    result = extract_faculty_fields("Jane Doe", "Professor", "Too short.", client, "test-model")

    assert result == ExtractedFields(phd_institution=None, methodology=None)
    client.chat.completions.create.assert_not_called()


def test_successful_extraction_parses_response():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "phd_institution": "MIT",
            "methodology": "Quantitative",
            "topics": ["Innovation", "Corporate Strategy"],
            "theories": ["RBV"],
            "personal_website_url": None,
            "google_scholar_url": "https://scholar.google.com/citations?user=abc123",
        }
    )

    bio = (
        "Jane Doe is an Assistant Professor whose research focuses on "
        "innovation and corporate strategy in technology firms over many "
        "years of study."
    )
    result = extract_faculty_fields("Jane Doe", "Assistant Professor", bio, client, "test-model")

    assert result == ExtractedFields(
        phd_institution="MIT",
        methodology="Quantitative",
        topics=["Innovation", "Corporate Strategy"],
        theories=["RBV"],
        personal_website_url=None,
        google_scholar_url="https://scholar.google.com/citations?user=abc123",
    )


def test_retries_on_error_then_succeeds(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = [
        RuntimeError("temporary failure"),
        _mock_response(
            {
                "phd_institution": "Stanford",
                "methodology": "Qualitative",
                "topics": ["Entrepreneurship"],
                "theories": [],
                "personal_website_url": None,
                "google_scholar_url": None,
            }
        ),
    ]

    bio = (
        "A long enough bio describing research on entrepreneurship and new "
        "venture creation across many industries."
    )
    result = extract_faculty_fields("John Smith", "Professor", bio, client, "test-model")

    assert result.phd_institution == "Stanford"
    assert client.chat.completions.create.call_count == 2


def test_raises_after_max_attempts(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("permanent failure")

    bio = (
        "A long enough bio describing research on entrepreneurship and new "
        "venture creation across many industries."
    )

    with pytest.raises(ExtractionError):
        extract_faculty_fields("John Smith", "Professor", bio, client, "test-model")

    assert client.chat.completions.create.call_count == 3


def test_extract_faculty_list_parses_response_and_resolves_urls():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "faculty": [
                {"name": "Jane Doe", "title": "Associate Professor", "profile_url": "/faculty/jane-doe"},
                {"name": "John Smith", "title": "Assistant Professor", "profile_url": "/faculty/john-smith"},
            ]
        }
    )

    result = extract_faculty_list(
        "Strategy Faculty\n[Jane Doe](/faculty/jane-doe)\n[John Smith](/faculty/john-smith)",
        "Strategy and Strategic Management faculty",
        "https://example.edu/faculty",
        client,
        "test-model",
    )

    assert result == [
        FacultyStub(name="Jane Doe", title="Associate Professor", profile_url="https://example.edu/faculty/jane-doe"),
        FacultyStub(name="John Smith", title="Assistant Professor", profile_url="https://example.edu/faculty/john-smith"),
    ]


def test_extract_faculty_list_skips_entries_without_name():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "faculty": [
                {"name": "Jane Doe", "title": None, "profile_url": "/faculty/jane-doe"},
                {"name": "", "title": "Visiting Scholar", "profile_url": "/faculty/unknown"},
            ]
        }
    )

    result = extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert len(result) == 1
    assert result[0].name == "Jane Doe"


def test_extract_faculty_list_falls_back_to_base_url_when_profile_url_missing():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {"faculty": [{"name": "Jane Doe", "title": "Professor", "profile_url": None}]}
    )

    result = extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert result == [FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/faculty")]


def test_extract_faculty_list_raises_after_max_attempts(monkeypatch):
    monkeypatch.setattr("scraper.extract.time.sleep", lambda _: None)

    client = MagicMock()
    client.chat.completions.create.side_effect = RuntimeError("permanent failure")

    with pytest.raises(ExtractionError):
        extract_faculty_list("...", "Strategy faculty", "https://example.edu/faculty", client, "test-model")

    assert client.chat.completions.create.call_count == 3
