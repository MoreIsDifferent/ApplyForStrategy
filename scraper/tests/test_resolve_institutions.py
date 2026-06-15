import csv
from unittest.mock import MagicMock

from scraper import openalex, resolve_institutions
from tests.fake_supabase import FakeSupabaseClient


def test_suffix_candidates_strips_trailing_words():
    assert resolve_institutions.suffix_candidates("Harvard Business School") == ["Harvard Business", "Harvard"]
    assert resolve_institutions.suffix_candidates("Chicago Booth") == ["Chicago"]
    assert resolve_institutions.suffix_candidates("INSEAD") == []


def test_resolve_school_uses_phrase_match_when_available(monkeypatch):
    monkeypatch.setattr(
        openalex,
        "search_institutions_by_phrase",
        MagicMock(
            return_value=[
                {
                    "id": "I61544103",
                    "display_name": "London Business School",
                    "works_count": 5000,
                    "homepage_url": "https://www.london.edu",
                }
            ]
        ),
    )
    search_institutions = MagicMock()
    monkeypatch.setattr(openalex, "search_institutions", search_institutions)

    result = resolve_institutions.resolve_school("London Business School")

    assert result["id"] == "I61544103"
    assert result["query_used"] == 'phrase:"London Business School"'
    search_institutions.assert_not_called()


def test_resolve_school_falls_back_to_suffix_stripped_search(monkeypatch):
    monkeypatch.setattr(openalex, "search_institutions_by_phrase", MagicMock(return_value=[]))

    def fake_search(query, per_page=1):
        if query == "Harvard Business":
            return []
        if query == "Harvard":
            return [
                {
                    "id": "I136199984",
                    "display_name": "Harvard University",
                    "works_count": 500000,
                    "homepage_url": "https://www.harvard.edu",
                }
            ]
        raise AssertionError(f"unexpected query {query!r}")

    monkeypatch.setattr(openalex, "search_institutions", MagicMock(side_effect=fake_search))

    result = resolve_institutions.resolve_school("Harvard Business School")

    assert result["id"] == "I136199984"
    assert result["query_used"] == 'search:"Harvard"'


def test_resolve_school_returns_no_match_when_nothing_found(monkeypatch):
    monkeypatch.setattr(openalex, "search_institutions_by_phrase", MagicMock(return_value=[]))
    monkeypatch.setattr(openalex, "search_institutions", MagicMock(return_value=[]))

    result = resolve_institutions.resolve_school("Nonexistent University Xyzzy")

    assert result["id"] == ""
    assert result["query_used"] == "no match"


def test_generate_report_writes_csv_for_unresolved_schools(monkeypatch, tmp_path):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [
            {"id": "school-1", "slug": "harvard-hbs", "name": "Harvard Business School", "openalex_institution_id": None},
            {"id": "school-2", "slug": "wharton", "name": "Wharton (UPenn)", "openalex_institution_id": "I79576946"},
        ],
    )

    monkeypatch.setattr(
        resolve_institutions,
        "resolve_school",
        MagicMock(
            return_value={
                "id": "I136199984",
                "display_name": "Harvard University",
                "works_count": 500000,
                "homepage_url": "https://www.harvard.edu",
                "query_used": 'search:"Harvard"',
            }
        ),
    )

    report_path = tmp_path / "report.csv"
    count = resolve_institutions.generate_report(client, report_path)

    assert count == 1
    rows = list(csv.DictReader(report_path.open()))
    assert len(rows) == 1
    assert rows[0]["slug"] == "harvard-hbs"
    assert rows[0]["openalex_institution_id"] == "I136199984"
    assert rows[0]["query_used"] == 'search:"Harvard"'


def test_generate_report_continues_after_resolve_school_error(monkeypatch, tmp_path):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [
            {"id": "school-1", "slug": "broken-school", "name": "Broken School", "openalex_institution_id": None},
            {"id": "school-2", "slug": "harvard-hbs", "name": "Harvard Business School", "openalex_institution_id": None},
        ],
    )

    def fake_resolve(school_name):
        if school_name == "Broken School":
            raise RuntimeError("timed out")
        return {
            "id": "I136199984",
            "display_name": "Harvard University",
            "works_count": 500000,
            "homepage_url": "https://www.harvard.edu",
            "query_used": 'search:"Harvard"',
        }

    monkeypatch.setattr(resolve_institutions, "resolve_school", MagicMock(side_effect=fake_resolve))

    report_path = tmp_path / "report.csv"
    count = resolve_institutions.generate_report(client, report_path)

    assert count == 2
    rows = list(csv.DictReader(report_path.open()))
    assert rows[0]["slug"] == "broken-school"
    assert rows[0]["openalex_institution_id"] == ""
    assert rows[0]["query_used"] == "error: timed out"
    assert rows[1]["slug"] == "harvard-hbs"
    assert rows[1]["openalex_institution_id"] == "I136199984"


def test_apply_report_updates_school_institution_ids(tmp_path):
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"id": "school-1", "slug": "harvard-hbs", "name": "Harvard Business School", "openalex_institution_id": None}],
    )

    report_path = tmp_path / "report.csv"
    with report_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=resolve_institutions.REPORT_FIELDS)
        writer.writeheader()
        writer.writerow(
            {
                "slug": "harvard-hbs",
                "school_name": "Harvard Business School",
                "openalex_institution_id": "I136199984",
                "display_name": "Harvard University",
                "works_count": "500000",
                "homepage_url": "https://www.harvard.edu",
                "query_used": 'search:"Harvard"',
            }
        )
        writer.writerow(
            {
                "slug": "some-school",
                "school_name": "Some School",
                "openalex_institution_id": "",
                "display_name": "",
                "works_count": "",
                "homepage_url": "",
                "query_used": "no match",
            }
        )

    updated = resolve_institutions.apply_report(client, report_path)

    assert updated == 1
    school = client.tables["schools"].rows[0]
    assert school["openalex_institution_id"] == "I136199984"


def test_reset_ambiguous_clears_flag_only_for_unmatched_ambiguous_faculty():
    client = FakeSupabaseClient()
    client.seed(
        "faculty",
        [
            {"id": "fac-1", "name": "A", "openalex_author_id": None, "openalex_match_confidence": "ambiguous", "needs_review": True},
            {"id": "fac-2", "name": "B", "openalex_author_id": "A2", "openalex_match_confidence": "ambiguous", "needs_review": True},
            {"id": "fac-3", "name": "C", "openalex_author_id": None, "openalex_match_confidence": None, "needs_review": True},
        ],
    )

    updated = resolve_institutions.reset_ambiguous(client)

    assert updated == 1
    rows = {row["id"]: row for row in client.tables["faculty"].rows}
    assert rows["fac-1"]["openalex_match_confidence"] is None
    assert rows["fac-1"]["needs_review"] is False
    assert rows["fac-2"]["openalex_match_confidence"] == "ambiguous"
    assert rows["fac-3"]["needs_review"] is True
