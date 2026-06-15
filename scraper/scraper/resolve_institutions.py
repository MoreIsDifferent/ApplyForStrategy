import csv
import os
from pathlib import Path

from scraper import openalex

DEFAULT_REPORT_PATH = Path("output/institution_resolution_report.csv")

REPORT_FIELDS = [
    "slug",
    "school_name",
    "openalex_institution_id",
    "display_name",
    "works_count",
    "homepage_url",
    "query_used",
]


def suffix_candidates(name: str) -> list[str]:
    words = name.split()
    return [" ".join(words[:i]) for i in range(len(words) - 1, 0, -1)]


def resolve_school(school_name: str) -> dict:
    results = openalex.search_institutions_by_phrase(school_name, per_page=1)
    if results:
        return {**results[0], "query_used": f'phrase:"{school_name}"'}

    for candidate in suffix_candidates(school_name):
        results = openalex.search_institutions(candidate, per_page=1)
        if results:
            return {**results[0], "query_used": f'search:"{candidate}"'}

    return {"id": "", "display_name": "", "works_count": "", "homepage_url": "", "query_used": "no match"}


def generate_report(supabase, report_path: Path = DEFAULT_REPORT_PATH) -> int:
    schools = supabase.table("schools").select("id, slug, name, openalex_institution_id").execute().data
    targets = [school for school in schools if not school.get("openalex_institution_id")]

    report_path.parent.mkdir(parents=True, exist_ok=True)
    with report_path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=REPORT_FIELDS)
        writer.writeheader()
        for school in targets:
            try:
                resolution = resolve_school(school["name"])
            except Exception as exc:
                resolution = {
                    "id": "",
                    "display_name": "",
                    "works_count": "",
                    "homepage_url": "",
                    "query_used": f"error: {exc}",
                }
            writer.writerow(
                {
                    "slug": school["slug"],
                    "school_name": school["name"],
                    "openalex_institution_id": resolution["id"],
                    "display_name": resolution["display_name"],
                    "works_count": resolution["works_count"],
                    "homepage_url": resolution["homepage_url"],
                    "query_used": resolution["query_used"],
                }
            )
    return len(targets)


def apply_report(supabase, report_path: Path = DEFAULT_REPORT_PATH) -> int:
    updated = 0
    with report_path.open(newline="") as f:
        for row in csv.DictReader(f):
            institution_id = row["openalex_institution_id"].strip()
            if not institution_id:
                continue
            supabase.table("schools").update({"openalex_institution_id": institution_id}).eq(
                "slug", row["slug"]
            ).execute()
            updated += 1
    return updated


def reset_ambiguous(supabase) -> int:
    result = (
        supabase.table("faculty")
        .update({"openalex_match_confidence": None, "needs_review": False})
        .eq("openalex_match_confidence", "ambiguous")
        .is_("openalex_author_id", "null")
        .execute()
    )
    return len(result.data)


def main() -> None:
    import argparse

    from supabase import create_client

    parser = argparse.ArgumentParser(description="Resolve schools' OpenAlex institution IDs")
    parser.add_argument("--generate-report", action="store_true", help="Write the resolution report CSV")
    parser.add_argument("--apply", action="store_true", help="Apply a reviewed report CSV to schools")
    parser.add_argument("--reset-ambiguous", action="store_true", help="Reset incorrectly-flagged ambiguous faculty")
    parser.add_argument("--report-path", default=str(DEFAULT_REPORT_PATH), help="Path to the report CSV")
    args = parser.parse_args()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    report_path = Path(args.report_path)

    if args.generate_report:
        count = generate_report(supabase, report_path)
        print(f"Wrote {count} schools to {report_path}")
    if args.apply:
        count = apply_report(supabase, report_path)
        print(f"Updated openalex_institution_id for {count} schools")
    if args.reset_ambiguous:
        count = reset_ambiguous(supabase)
        print(f"Reset {count} faculty from 'ambiguous' for re-matching")


if __name__ == "__main__":
    main()
