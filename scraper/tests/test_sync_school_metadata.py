from scraper.sync_school_metadata import sync_school_metadata
from tests.fake_supabase import FakeSupabaseClient


def test_inserts_new_school_with_metadata():
    client = FakeSupabaseClient()

    sync_school_metadata(
        client,
        [
            {
                "slug": "texas-mccombs",
                "name": "Texas McCombs",
                "geography": "South",
                "ranking_utd": 15,
                "website_url": "https://www.mccombs.utexas.edu",
            }
        ],
    )

    rows = client.tables["schools"].rows
    assert len(rows) == 1
    assert rows[0]["slug"] == "texas-mccombs"
    assert rows[0]["geography"] == "South"
    assert rows[0]["ranking_utd"] == 15
    assert rows[0]["website_url"] == "https://www.mccombs.utexas.edu"


def test_updates_existing_school_metadata_without_changing_slug_or_name():
    client = FakeSupabaseClient()
    client.seed(
        "schools",
        [{"slug": "duke-fuqua", "name": "Duke Fuqua", "geography": None, "ranking_utd": None, "website_url": None}],
    )

    sync_school_metadata(
        client,
        [
            {
                "slug": "duke-fuqua",
                "name": "Duke Fuqua",
                "geography": "South",
                "ranking_utd": 11,
                "website_url": "https://www.fuqua.duke.edu",
            }
        ],
    )

    rows = client.tables["schools"].rows
    assert len(rows) == 1
    assert rows[0]["slug"] == "duke-fuqua"
    assert rows[0]["name"] == "Duke Fuqua"
    assert rows[0]["geography"] == "South"
    assert rows[0]["ranking_utd"] == 11
    assert rows[0]["website_url"] == "https://www.fuqua.duke.edu"
