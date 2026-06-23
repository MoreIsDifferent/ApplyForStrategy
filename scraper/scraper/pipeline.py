import argparse
import hashlib
import json
import logging
import os
from pathlib import Path

from scraper import generic
from scraper.config import load_school_configs
from scraper.extract import build_client, extract_faculty_fields, get_model
from scraper.schools import (
    chicago_booth,
    columbia_cbs,
    georgetown_mcdonough,
    ucla_anderson,
    usc_marshall,
    wharton,
)
from scraper.types import SchoolConfig

SCRAPER_MODULES = {
    "wharton": wharton,
    "chicago-booth": chicago_booth,
    "ucla-anderson": ucla_anderson,
    "usc-marshall": usc_marshall,
    "columbia-cbs": columbia_cbs,
    "georgetown-mcdonough": georgetown_mcdonough,
}


def _bio_hash(bio_text: str) -> str:
    return "sha256:" + hashlib.sha256(bio_text.encode("utf-8")).hexdigest()


def scrape_school(config: SchoolConfig, client, model: str, limit: int | None = None) -> list[dict]:
    if config.slug in SCRAPER_MODULES:
        module = SCRAPER_MODULES[config.slug]
        stubs = module.scrape_faculty_list(config)
        bio_fn = module.scrape_bio
    else:
        stubs = generic.scrape_faculty_list(config, client, model)
        bio_fn = generic.scrape_bio

    if limit is not None:
        stubs = stubs[:limit]

    records = []
    for stub in stubs:
        bio_text = bio_fn(config, stub)
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


def run_pipeline(
    config_path: Path, output_dir: Path, school_slug: str | None = None, limit: int | None = None
) -> list[tuple[str, str]]:
    configs = load_school_configs(config_path)
    if school_slug:
        configs = [c for c in configs if c.slug == school_slug]

    client = build_client()
    model = get_model()

    output_dir.mkdir(parents=True, exist_ok=True)
    failures: list[tuple[str, str]] = []
    for config in configs:
        try:
            records = scrape_school(config, client, model, limit=limit)
        except Exception as exc:
            logging.exception(f"Error scraping {config.slug}")
            failures.append((config.slug, f"{type(exc).__name__}: {exc}"))
            continue
        output_path = output_dir / f"{config.slug}.json"
        output_path.write_text(json.dumps(records, indent=2))

    if failures:
        print("=== Pipeline run summary: failures ===")
        for slug, message in failures:
            print(f"FAILED: {slug} - {message}")

    return failures


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape faculty bios for configured schools")
    parser.add_argument("--school", help="Only scrape this school slug")
    parser.add_argument("--limit", type=int, help="Only process this many faculty per school")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    limit_env = os.environ.get("SCRAPE_LIMIT")
    run_pipeline(
        config_path=repo_root / "config" / "schools.yaml",
        output_dir=repo_root / "output",
        school_slug=args.school,
        limit=args.limit if args.limit is not None else (int(limit_env) if limit_env else None),
    )
