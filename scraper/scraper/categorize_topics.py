import json
import os

CATEGORIES = [
    "Corporate Strategy & Governance",
    "Innovation & Technology",
    "Entrepreneurship & New Ventures",
    "Strategic Leadership & Management",
    "Organizational Behavior & Design",
    "People, Talent & DEI",
    "Decision Making & Behavioral Science",
    "Markets, Competition & Industry",
    "Social Impact & Sustainability",
    "Global Strategy & Emerging Markets",
    "Other",
]

CATEGORIZATION_SYSTEM_PROMPT = (
    "You are organizing a list of academic research topic strings from business "
    "school faculty bios into a fixed taxonomy.\n\n"
    "For each topic string in the input, return an object with:\n"
    '- "name": the original topic string, unchanged (used to match back to the source row)\n'
    '- "canonical_name": a normalized display name. Merge near-duplicate or synonymous '
    'topics (e.g. "Behavior Change" and "Behavioral Change" should both get the same '
    'canonical_name, e.g. "Behavioral Change"). Use title case, prefer the singular form.\n'
    '- "category": exactly one of these categories: ' + ", ".join(CATEGORIES) + ". "
    'Use "Other" only if no other category fits.\n\n'
    'Respond with ONLY a JSON object of the form {"topics": [{"name": "...", '
    '"canonical_name": "...", "category": "..."}, ...]}, with one entry for every input '
    "topic, in the same order as the input."
)

BATCH_SIZE = 50


def categorize_topics(topic_names: list[str], client, model: str) -> list[dict]:
    results: list[dict] = []
    for i in range(0, len(topic_names), BATCH_SIZE):
        batch = topic_names[i : i + BATCH_SIZE]
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CATEGORIZATION_SYSTEM_PROMPT},
                {"role": "user", "content": json.dumps({"topics": batch})},
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        results.extend(data["topics"])
    return results


def main() -> None:
    from supabase import create_client

    from scraper.extract import build_client, get_model

    supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    result = supabase.table("topics").select("id, name").eq("needs_categorization", True).execute()
    rows = result.data
    if not rows:
        print("No topics need categorization")
        return

    client = build_client()
    model = get_model()
    mapping = categorize_topics([row["name"] for row in rows], client, model)
    by_name = {entry["name"]: entry for entry in mapping}

    updated = 0
    for row in rows:
        entry = by_name.get(row["name"])
        if entry is None:
            continue
        supabase.table("topics").update(
            {
                "canonical_name": entry["canonical_name"],
                "category": entry["category"],
                "needs_categorization": False,
            }
        ).eq("id", row["id"]).execute()
        updated += 1

    print(f"Categorized {updated}/{len(rows)} topics")


if __name__ == "__main__":
    main()
