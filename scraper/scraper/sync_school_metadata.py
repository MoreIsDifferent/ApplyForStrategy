import csv
import os
from pathlib import Path


def sync_school_metadata(supabase, rows: list[dict]) -> None:
    for row in rows:
        existing = supabase.table("schools").select("id").eq("slug", row["slug"]).execute()
        metadata = {
            "geography": row["geography"],
            "ranking_utd": row["ranking_utd"],
            "website_url": row["website_url"],
        }
        if existing.data:
            supabase.table("schools").update(metadata).eq("slug", row["slug"]).execute()
        else:
            supabase.table("schools").insert(
                {"slug": row["slug"], "name": row["name"], **metadata}
            ).execute()


def load_rows_from_csv(path: Path) -> list[dict]:
    rows = []
    with open(path) as f:
        for row in csv.DictReader(f):
            if row["rank"].startswith("#"):
                continue
            rows.append(
                {
                    "slug": row["slug"],
                    "name": row["name"],
                    "geography": row["geography"],
                    "ranking_utd": int(row["rank"]),
                    "website_url": row["website_url"],
                }
            )
    return rows


def main() -> None:
    from supabase import create_client

    repo_root = Path(__file__).resolve().parent.parent
    client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows = load_rows_from_csv(repo_root / "research" / "school_rankings.csv")
    sync_school_metadata(client, rows)


if __name__ == "__main__":
    main()
