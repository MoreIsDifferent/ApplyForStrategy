import json
from unittest.mock import MagicMock

import scraper.pipeline as pipeline_module
from scraper.pipeline import scrape_school
from scraper.types import FacultyStub, SchoolConfig


def _llm_client(payload: dict) -> MagicMock:
    client = MagicMock()
    client.chat.completions.create.return_value = MagicMock(
        choices=[MagicMock(message=MagicMock(content=json.dumps(payload)))]
    )
    return client


def test_scrape_school_assembles_records(monkeypatch):
    config = SchoolConfig(
        slug="wharton",
        name="Wharton (UPenn)",
        directory_url="https://example.edu/faculty",
        fetch_mode="static",
    )

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(
            name="Jane Doe",
            title="Assistant Professor",
            profile_url="https://example.edu/jane-doe",
        ),
    ]
    fake_module.scrape_bio.return_value = (
        "Jane Doe studies innovation and corporate strategy in technology firms."
    )
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": "MIT",
            "methodology": "Quantitative",
            "topics": ["Innovation"],
            "theories": ["RBV"],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )

    records = scrape_school(config, client, "test-model")

    assert len(records) == 1
    record = records[0]
    assert record["name"] == "Jane Doe"
    assert record["title"] == "Assistant Professor"
    assert record["school_profile_url"] == "https://example.edu/jane-doe"
    assert record["phd_institution"] == "MIT"
    assert record["methodology"] == "Quantitative"
    assert record["topics"] == ["Innovation"]
    assert record["theories"] == ["RBV"]
    assert record["bio_hash"].startswith("sha256:")


def test_scrape_school_respects_limit(monkeypatch):
    config = SchoolConfig(
        slug="wharton",
        name="Wharton (UPenn)",
        directory_url="https://example.edu/faculty",
        fetch_mode="static",
    )

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(name="A", title="Professor", profile_url="https://example.edu/a"),
        FacultyStub(name="B", title="Professor", profile_url="https://example.edu/b"),
    ]
    fake_module.scrape_bio.return_value = "x" * 100
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": None,
            "methodology": None,
            "topics": [],
            "theories": [],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )

    records = scrape_school(config, client, "test-model", limit=1)

    assert len(records) == 1
    assert fake_module.scrape_bio.call_count == 1


def test_run_pipeline_writes_output_json(tmp_path, monkeypatch):
    config_path = tmp_path / "schools.yaml"
    config_path.write_text(
        "- slug: wharton\n"
        "  name: Wharton (UPenn)\n"
        "  directory_url: https://example.edu/faculty\n"
        "  fetch_mode: static\n"
    )
    output_dir = tmp_path / "output"

    fake_module = MagicMock()
    fake_module.scrape_faculty_list.return_value = [
        FacultyStub(name="Jane Doe", title="Professor", profile_url="https://example.edu/jane-doe"),
    ]
    fake_module.scrape_bio.return_value = "x" * 100
    monkeypatch.setitem(pipeline_module.SCRAPER_MODULES, "wharton", fake_module)

    client = _llm_client(
        {
            "phd_institution": None,
            "methodology": None,
            "topics": [],
            "theories": [],
            "personal_website_url": None,
            "google_scholar_url": None,
        }
    )
    monkeypatch.setattr(pipeline_module, "build_client", lambda: client)
    monkeypatch.setattr(pipeline_module, "get_model", lambda: "test-model")

    pipeline_module.run_pipeline(config_path, output_dir)

    output_file = output_dir / "wharton.json"
    assert output_file.exists()
    data = json.loads(output_file.read_text())
    assert len(data) == 1
    assert data[0]["name"] == "Jane Doe"
