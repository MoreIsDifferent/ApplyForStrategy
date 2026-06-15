import itertools
import os

from scraper import openalex

PAGE_SIZE = 1000


def upsert_publication(supabase, faculty_id: str, work: dict) -> None:
    existing = (
        supabase.table("publications")
        .select("id")
        .eq("faculty_id", faculty_id)
        .eq("openalex_id", work["openalex_id"])
        .execute()
    )

    fields = {
        "faculty_id": faculty_id,
        "title": work["title"],
        "year": work["year"],
        "journal": work["journal"],
        "citation_count": work["citation_count"],
        "coauthors": work["coauthors"],
        "abstract": work["abstract"],
        "openalex_id": work["openalex_id"],
    }

    if existing.data:
        supabase.table("publications").update(fields).eq("id", existing.data[0]["id"]).execute()
    else:
        supabase.table("publications").insert(fields).execute()


def enrich_faculty(supabase, faculty_row: dict, institution_cache: dict[str, str | None]) -> None:
    if faculty_row.get("openalex_author_id"):
        for work in openalex.fetch_works(faculty_row["openalex_author_id"]):
            upsert_publication(supabase, faculty_row["id"], work)
        return

    school_id = faculty_row["school_id"]

    if school_id not in institution_cache:
        school = (
            supabase.table("schools")
            .select("id, name, openalex_institution_id")
            .eq("id", school_id)
            .execute()
            .data[0]
        )
        institution_id = school.get("openalex_institution_id")
        if not institution_id:
            institution_id = openalex.resolve_institution_id(school["name"])
            if institution_id:
                supabase.table("schools").update({"openalex_institution_id": institution_id}).eq(
                    "id", school_id
                ).execute()
        institution_cache[school_id] = institution_id

    institution_id = institution_cache[school_id]
    author_id, confidence = openalex.find_author(faculty_row["name"], institution_id)

    if author_id is None:
        supabase.table("faculty").update(
            {"openalex_match_confidence": "ambiguous", "needs_review": True}
        ).eq("id", faculty_row["id"]).execute()
        return

    supabase.table("faculty").update(
        {"openalex_author_id": author_id, "openalex_match_confidence": confidence}
    ).eq("id", faculty_row["id"]).execute()

    for work in openalex.fetch_works(author_id):
        upsert_publication(supabase, faculty_row["id"], work)


def run(supabase, school_slug: str | None = None, limit: int | None = None) -> None:
    query = supabase.table("faculty").select("id, name, school_id, openalex_author_id")
    if school_slug:
        school = supabase.table("schools").select("id").eq("slug", school_slug).execute().data[0]
        query = query.eq("school_id", school["id"])

    rows: list[dict] = []
    for offset in itertools.count(0, PAGE_SIZE):
        page = query.range(offset, offset + PAGE_SIZE - 1).execute().data
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break

    if limit is not None:
        rows = rows[:limit]

    institution_cache: dict[str, str | None] = {}
    for row in rows:
        enrich_faculty(supabase, row, institution_cache)


def main() -> None:
    import argparse

    from supabase import create_client

    parser = argparse.ArgumentParser(description="Enrich faculty with OpenAlex publication data")
    parser.add_argument("--school", help="Only process faculty at this school slug")
    parser.add_argument("--limit", type=int, help="Only process this many faculty")
    args = parser.parse_args()

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
    run(supabase, school_slug=args.school, limit=args.limit)


if __name__ == "__main__":
    main()
