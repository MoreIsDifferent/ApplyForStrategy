import json

from scraper.validate import validate_output_dir

REQUIRED_FIELDS = {
    "name",
    "title",
    "school_profile_url",
    "personal_website_url",
    "google_scholar_url",
    "phd_institution",
    "methodology",
    "topics",
    "theories",
    "bio_hash",
}


def _record(**overrides):
    base = {
        "name": "Jane Doe",
        "title": "Professor",
        "school_profile_url": "https://example.edu/jane-doe",
        "personal_website_url": None,
        "google_scholar_url": None,
        "phd_institution": "MIT",
        "methodology": "Quantitative",
        "topics": ["Strategy"],
        "theories": [],
        "bio_hash": "sha256:abc",
    }
    base.update(overrides)
    return base


def test_validate_flags_empty_roster(tmp_path):
    (tmp_path / "empty-school.json").write_text(json.dumps([]))

    issues = validate_output_dir(tmp_path)

    assert any("empty-school" in issue and "empty roster" in issue for issue in issues)


def test_validate_flags_missing_fields(tmp_path):
    record = _record()
    del record["topics"]
    (tmp_path / "bad-school.json").write_text(json.dumps([record]))

    issues = validate_output_dir(tmp_path)

    assert any("bad-school" in issue and "topics" in issue for issue in issues)


def test_validate_flags_invalid_json(tmp_path):
    (tmp_path / "broken-school.json").write_text("not json")

    issues = validate_output_dir(tmp_path)

    assert any("broken-school" in issue and "invalid JSON" in issue for issue in issues)


def test_validate_flags_outlier_roster_size(tmp_path):
    (tmp_path / "tiny-school.json").write_text(json.dumps([_record()]))

    issues = validate_output_dir(tmp_path)

    assert any("tiny-school" in issue and "roster size" in issue for issue in issues)


def test_validate_passes_clean_output(tmp_path):
    records = [_record(name=f"Person {i}") for i in range(10)]
    (tmp_path / "good-school.json").write_text(json.dumps(records))

    issues = validate_output_dir(tmp_path)

    assert not any("good-school" in issue for issue in issues)
