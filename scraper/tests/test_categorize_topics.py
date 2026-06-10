import json
from unittest.mock import MagicMock

from scraper.categorize_topics import BATCH_SIZE, categorize_topics


def _mock_response(content: dict) -> MagicMock:
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=json.dumps(content)))]
    return response


def test_categorize_topics_sends_single_batch_for_small_input():
    client = MagicMock()
    client.chat.completions.create.return_value = _mock_response(
        {
            "topics": [
                {
                    "name": "Behavior Change",
                    "canonical_name": "Behavioral Change",
                    "category": "Decision Making & Behavioral Science",
                },
                {
                    "name": "Behavioral Change",
                    "canonical_name": "Behavioral Change",
                    "category": "Decision Making & Behavioral Science",
                },
            ]
        }
    )

    result = categorize_topics(["Behavior Change", "Behavioral Change"], client, "test-model")

    assert result == [
        {
            "name": "Behavior Change",
            "canonical_name": "Behavioral Change",
            "category": "Decision Making & Behavioral Science",
        },
        {
            "name": "Behavioral Change",
            "canonical_name": "Behavioral Change",
            "category": "Decision Making & Behavioral Science",
        },
    ]
    client.chat.completions.create.assert_called_once()


def test_categorize_topics_splits_into_batches():
    client = MagicMock()
    client.chat.completions.create.side_effect = [
        _mock_response(
            {
                "topics": [
                    {"name": f"Topic {i}", "canonical_name": f"Topic {i}", "category": "Other"}
                    for i in range(BATCH_SIZE)
                ]
            }
        ),
        _mock_response(
            {"topics": [{"name": "Topic Last", "canonical_name": "Topic Last", "category": "Other"}]}
        ),
    ]

    topic_names = [f"Topic {i}" for i in range(BATCH_SIZE)] + ["Topic Last"]
    result = categorize_topics(topic_names, client, "test-model")

    assert len(result) == BATCH_SIZE + 1
    assert client.chat.completions.create.call_count == 2
