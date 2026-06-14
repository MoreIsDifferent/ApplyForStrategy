import json
from pathlib import Path

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

MIN_PLAUSIBLE_ROSTER = 2
MAX_PLAUSIBLE_ROSTER = 100


def validate_output_dir(output_dir: Path) -> list[str]:
    issues: list[str] = []

    for path in sorted(output_dir.glob("*.json")):
        slug = path.stem
        try:
            records = json.loads(path.read_text())
        except json.JSONDecodeError:
            issues.append(f"{slug}: invalid JSON")
            continue

        if not isinstance(records, list) or len(records) == 0:
            issues.append(f"{slug}: empty roster")
            continue

        for index, record in enumerate(records):
            missing = REQUIRED_FIELDS - set(record.keys())
            if missing:
                issues.append(f"{slug}: record {index} missing fields {sorted(missing)}")

        if not (MIN_PLAUSIBLE_ROSTER <= len(records) <= MAX_PLAUSIBLE_ROSTER):
            issues.append(
                f"{slug}: roster size {len(records)} outside plausible range "
                f"[{MIN_PLAUSIBLE_ROSTER}, {MAX_PLAUSIBLE_ROSTER}]"
            )

    return issues


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    found_issues = validate_output_dir(repo_root / "output")
    if found_issues:
        print("=== Validation issues ===")
        for issue in found_issues:
            print(issue)
    else:
        print("No issues found.")
