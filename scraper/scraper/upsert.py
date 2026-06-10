import json
import os
from pathlib import Path


def get_school_id(supabase, slug: str) -> str:
    result = supabase.table("schools").select("id").eq("slug", slug).execute()
    if not result.data:
        raise ValueError(f"School with slug '{slug}' not found in schools table")
    return result.data[0]["id"]


def get_or_create_tag_id(supabase, table: str, name: str) -> str:
    result = supabase.table(table).select("id").ilike("name", name).execute()
    if result.data:
        return result.data[0]["id"]
    result = supabase.table(table).insert({"name": name}).execute()
    return result.data[0]["id"]


def upsert_faculty_record(supabase, school_id: str, record: dict) -> str:
    existing = (
        supabase.table("faculty")
        .select("id, bio_hash")
        .eq("school_id", school_id)
        .eq("name", record["name"])
        .execute()
    )

    fields = {
        "name": record["name"],
        "school_id": school_id,
        "title": record["title"],
        "phd_institution": record["phd_institution"],
        "school_profile_url": record["school_profile_url"],
        "personal_website_url": record["personal_website_url"],
        "google_scholar_url": record["google_scholar_url"],
        "methodology": record["methodology"],
        "bio_hash": record["bio_hash"],
    }

    if not existing.data:
        fields["needs_review"] = True
        result = supabase.table("faculty").insert(fields).execute()
        return result.data[0]["id"]

    existing_row = existing.data[0]
    faculty_id = existing_row["id"]
    if existing_row.get("bio_hash") != record["bio_hash"]:
        fields["needs_review"] = True
        supabase.table("faculty").update(fields).eq("id", faculty_id).execute()

    return faculty_id


def replace_faculty_tags(
    supabase, faculty_id: str, tag_names: list[str], lookup_table: str, junction_table: str, junction_fk: str
) -> None:
    supabase.table(junction_table).delete().eq("faculty_id", faculty_id).execute()
    for name in tag_names:
        tag_id = get_or_create_tag_id(supabase, lookup_table, name)
        supabase.table(junction_table).insert({"faculty_id": faculty_id, junction_fk: tag_id}).execute()


def upsert_school_data(supabase, school_slug: str, records: list[dict]) -> None:
    school_id = get_school_id(supabase, school_slug)
    for record in records:
        faculty_id = upsert_faculty_record(supabase, school_id, record)
        replace_faculty_tags(supabase, faculty_id, record["topics"], "topics", "faculty_topics", "topic_id")
        replace_faculty_tags(supabase, faculty_id, record["theories"], "theories", "faculty_theories", "theory_id")


def main() -> None:
    from supabase import create_client

    from scraper.config import load_school_configs

    repo_root = Path(__file__).resolve().parent.parent
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    for school_config in load_school_configs(repo_root / "config" / "schools.yaml"):
        output_path = repo_root / "output" / f"{school_config.slug}.json"
        if not output_path.exists():
            continue
        records = json.loads(output_path.read_text())
        upsert_school_data(client, school_config.slug, records)


if __name__ == "__main__":
    main()
