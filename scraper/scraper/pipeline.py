import hashlib
import json
import os
from pathlib import Path

from scraper.config import load_school_configs
from scraper.extract import build_client, extract_faculty_fields, get_model
from scraper.schools import chicago_booth, ucla_anderson, wharton
from scraper.types import SchoolConfig

SCRAPER_MODULES = {
    "wharton": wharton,
    "chicago-booth": chicago_booth,
    "ucla-anderson": ucla_anderson,
}


def _bio_hash(bio_text: str) -> str:
    return "sha256:" + hashlib.sha256(bio_text.encode("utf-8")).hexdigest()


def scrape_school(config: SchoolConfig, client, model: str, limit: int | None = None) -> list[dict]:
    module = SCRAPER_MODULES[config.slug]
    stubs = module.scrape_faculty_list(config)
    if limit is not None:
        stubs = stubs[:limit]

    records = []
    for stub in stubs:
        bio_text = module.scrape_bio(config, stub)
        extracted = extract_faculty_fields(stub.name, stub.title, bio_text, client, model)
        records.append(
            {
                "name": stub.name,
                "title": stub.title,
                "school_profile_url": stub.profile_url,
                "personal_website_url": extracted.personal_website_url,
                "google_scholar_url": extracted.google_scholar_url,
                "phd_institution": extracted.phd_institution,
                "methodology": extracted.methodology,
                "topics": extracted.topics,
                "theories": extracted.theories,
                "bio_hash": _bio_hash(bio_text),
            }
        )
    return records


def run_pipeline(config_path: Path, output_dir: Path, limit: int | None = None) -> None:
    configs = load_school_configs(config_path)
    client = build_client()
    model = get_model()

    output_dir.mkdir(parents=True, exist_ok=True)
    for config in configs:
        records = scrape_school(config, client, model, limit=limit)
        output_path = output_dir / f"{config.slug}.json"
        output_path.write_text(json.dumps(records, indent=2))


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    limit_env = os.environ.get("SCRAPE_LIMIT")
    run_pipeline(
        config_path=repo_root / "config" / "schools.yaml",
        output_dir=repo_root / "output",
        limit=int(limit_env) if limit_env else None,
    )
