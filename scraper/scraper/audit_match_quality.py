import csv
import os
import random
from pathlib import Path

from scraper.openalex import _get

# Fields that indicate a plausible business-school author. Compared in lowercase
# against the author's OpenAlex x_concepts display names (substring match).
BUSINESS_FIELDS = {
    "business", "management", "economics", "marketing", "finance",
    "entrepreneurship", "strategy", "organizational", "accounting",
}

SAMPLE_SIZE = 100
OUTPUT_CSV = Path(__file__).resolve().parent.parent / "output" / "match_quality_suspects.csv"


def is_suspect_match(author: dict, school_name: str) -> bool:
    """A match is suspect when NEITHER the school appears in the author's
    affiliations NOR the author's fields look business-related."""
    institutions = author.get("last_known_institutions") or []
    school_lower = school_name.lower()
    school_hit = bool(school_lower) and any(
        school_lower in (inst.get("display_name") or "").lower()
        or (inst.get("display_name") or "").lower() in school_lower
        for inst in institutions
    )
    concepts = author.get("x_concepts") or []
    field_hit = any(
        any(bf in (c.get("display_name") or "").lower() for bf in BUSINESS_FIELDS)
        for c in concepts
    )
    return not (school_hit or field_hit)


def run(supabase, sample_size: int = SAMPLE_SIZE, score_all: bool = False) -> None:
    resp = (
        supabase.table("faculty")
        .select("id, name, openalex_author_id, schools(name)")
        .eq("openalex_match_confidence", "name_institution")
        .execute()
    )
    rows = [r for r in resp.data if r.get("openalex_author_id")]
    if not score_all and len(rows) > sample_size:
        rows = random.sample(rows, sample_size)

    suspects = []
    for r in rows:
        author = _get(f"/authors/{r['openalex_author_id']}", {})
        school_name = (r.get("schools") or {}).get("name", "")
        if is_suspect_match(author, school_name):
            suspects.append((r["name"], school_name, r["openalex_author_id"]))

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["faculty_name", "school", "openalex_author_id"])
        writer.writerows(suspects)

    checked = len(rows)
    ok = checked - len(suspects)
    pct = round(100 * ok / checked, 1) if checked else 0.0
    print(f"Checked {checked} name_institution matches.")
    print(f"Passed: {ok} ({pct}%)  |  Suspect: {len(suspects)}")
    print(f"Suspect list written to {OUTPUT_CSV}")


def main() -> None:
    import sys

    from supabase import create_client

    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    run(client, score_all="--all" in sys.argv)


if __name__ == "__main__":
    main()
