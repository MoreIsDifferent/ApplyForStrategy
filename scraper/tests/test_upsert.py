from scraper.upsert import upsert_school_data
from tests.fake_supabase import FakeSupabaseClient


def _record(**overrides):
    base = {
        "name": "Jane Doe",
        "title": "Assistant Professor",
        "school_profile_url": "https://example.edu/jane-doe",
        "personal_website_url": None,
        "google_scholar_url": None,
        "phd_institution": "MIT",
        "methodology": "Quantitative",
        "topics": ["Innovation"],
        "theories": ["RBV"],
        "bio_hash": "sha256:abc",
    }
    base.update(overrides)
    return base


def test_inserts_new_faculty_with_needs_review():
    client = FakeSupabaseClient()
    client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])

    upsert_school_data(client, "wharton", [_record()])

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["name"] == "Jane Doe"
    assert faculty_rows[0]["needs_review"] is True

    topic_rows = client.tables["topics"].rows
    assert [row["name"] for row in topic_rows] == ["Innovation"]

    junction_rows = client.tables["faculty_topics"].rows
    assert len(junction_rows) == 1
    assert junction_rows[0]["faculty_id"] == faculty_rows[0]["id"]
    assert junction_rows[0]["topic_id"] == topic_rows[0]["id"]


def test_unchanged_bio_hash_does_not_set_needs_review():
    client = FakeSupabaseClient()
    school = client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])[0]
    client.seed(
        "faculty",
        [
            {
                "name": "Jane Doe",
                "school_id": school["id"],
                "title": "Assistant Professor",
                "bio_hash": "sha256:abc",
                "needs_review": False,
            }
        ],
    )

    upsert_school_data(client, "wharton", [_record(bio_hash="sha256:abc")])

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["needs_review"] is False


def test_changed_bio_hash_sets_needs_review():
    client = FakeSupabaseClient()
    school = client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])[0]
    client.seed(
        "faculty",
        [
            {
                "name": "Jane Doe",
                "school_id": school["id"],
                "title": "Assistant Professor",
                "bio_hash": "sha256:old",
                "needs_review": False,
            }
        ],
    )

    upsert_school_data(
        client, "wharton", [_record(bio_hash="sha256:new", phd_institution="Stanford")]
    )

    faculty_rows = client.tables["faculty"].rows
    assert len(faculty_rows) == 1
    assert faculty_rows[0]["needs_review"] is True
    assert faculty_rows[0]["phd_institution"] == "Stanford"


def test_existing_topic_is_reused_case_insensitively():
    client = FakeSupabaseClient()
    client.seed("schools", [{"slug": "wharton", "name": "Wharton (UPenn)"}])
    client.seed("topics", [{"name": "innovation"}])

    upsert_school_data(client, "wharton", [_record(topics=["Innovation"])])

    topic_rows = client.tables["topics"].rows
    assert len(topic_rows) == 1
