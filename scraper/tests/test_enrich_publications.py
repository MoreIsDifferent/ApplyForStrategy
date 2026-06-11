from unittest.mock import MagicMock

from scraper import enrich_publications, openalex
from tests.fake_supabase import FakeSupabaseClient


def test_skips_faculty_already_matched(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": "A1"}],
    )

    find_author = MagicMock()
    monkeypatch.setattr(openalex, "find_author", find_author)

    enrich_publications.run(client)

    find_author.assert_not_called()


def test_ambiguous_match_sets_needs_review(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None, "needs_review": False}],
    )

    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=(None, "ambiguous")))
    fetch_works = MagicMock()
    monkeypatch.setattr(openalex, "fetch_works", fetch_works)

    enrich_publications.run(client)

    faculty_row = client.tables["faculty"].rows[0]
    assert faculty_row["needs_review"] is True
    assert faculty_row["openalex_match_confidence"] == "ambiguous"
    assert faculty_row.get("openalex_author_id") is None
    fetch_works.assert_not_called()


def test_successful_match_resolves_institution_and_upserts_publications(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": None}],
    )
    client.seed(
        "faculty",
        [{"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None}],
    )
    client.seed(
        "publications",
        [{"id": "pub-existing", "faculty_id": "fac-1", "openalex_id": "W1", "title": "Old Title", "citation_count": 10}],
    )

    monkeypatch.setattr(openalex, "resolve_institution_id", MagicMock(return_value="I79576946"))
    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=("A1", "name_institution")))
    monkeypatch.setattr(
        openalex,
        "fetch_works",
        MagicMock(
            return_value=[
                {
                    "openalex_id": "W1",
                    "title": "Updated Title",
                    "year": 2024,
                    "journal": "SMJ",
                    "citation_count": 99,
                    "coauthors": ["Jane Doe"],
                    "abstract": "abc",
                },
                {
                    "openalex_id": "W2",
                    "title": "New Paper",
                    "year": 2025,
                    "journal": "AMJ",
                    "citation_count": 1,
                    "coauthors": ["Jane Doe"],
                    "abstract": "def",
                },
            ]
        ),
    )

    enrich_publications.run(client)

    school_row = client.tables["schools"].rows[0]
    assert school_row["openalex_institution_id"] == "I79576946"

    faculty_row = client.tables["faculty"].rows[0]
    assert faculty_row["openalex_author_id"] == "A1"
    assert faculty_row["openalex_match_confidence"] == "name_institution"

    pub_rows = client.tables["publications"].rows
    assert len(pub_rows) == 2

    updated = next(p for p in pub_rows if p["openalex_id"] == "W1")
    assert updated["id"] == "pub-existing"
    assert updated["title"] == "Updated Title"
    assert updated["citation_count"] == 99

    new_pub = next(p for p in pub_rows if p["openalex_id"] == "W2")
    assert new_pub["title"] == "New Paper"


def test_run_filters_by_school_slug(monkeypatch):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [
            {"id": "school-1", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I1"},
            {"id": "school-2", "slug": "chicago-booth", "name": "Chicago Booth", "openalex_institution_id": "I2"},
        ],
    )
    client.seed(
        "faculty",
        [
            {"id": "fac-1", "name": "Jane Doe", "school_id": "school-1", "openalex_author_id": None, "needs_review": False},
            {"id": "fac-2", "name": "John Roe", "school_id": "school-2", "openalex_author_id": None, "needs_review": False},
        ],
    )

    monkeypatch.setattr(openalex, "find_author", MagicMock(return_value=(None, "ambiguous")))
    monkeypatch.setattr(openalex, "fetch_works", MagicMock())

    enrich_publications.run(client, school_slug="wharton")

    faculty_rows = {row["id"]: row for row in client.tables["faculty"].rows}
    assert faculty_rows["fac-1"]["needs_review"] is True
    assert faculty_rows["fac-2"]["needs_review"] is False
