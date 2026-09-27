from app.scoring.dev_engine import compute_dev


def test_creator_is_explicitly_a_candidate():
    out = compute_dev(
        {"authorities": [{"address": "AUTH"}]},
        [
            {"signature": "new", "feePayer": "NEW"},
            {"signature": "old", "feePayer": "OLD"},
        ],
        "MINT",
    )

    assert out.creator_candidate == "OLD"
    assert out.authority_addresses == ["AUTH"]
    assert out.earliest_observed_signature == "old"
    assert out.confidence == "MEDIUM"


def test_related_mints_are_observed_not_launches():
    out = compute_dev(
        {},
        [{"tokenTransfers": [{"mint": "OTHER"}, {"mint": "MINT"}]}],
        "MINT",
    )

    assert out.observed_related_mints == ["OTHER"]
    assert out.creator_candidate is None
