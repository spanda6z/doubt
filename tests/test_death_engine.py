from app.scoring.death_engine import compute_risk


def test_risk_requires_history():
    result = compute_risk(
        {
            "liquidity_usd": 10000,
            "volume_1h_usd": 1000,
            "holder_count": 100,
            "top10_pct": 20,
            "buy_pressure": 60,
        },
        [],
        [],
    )
    assert result.severity == "INSUFFICIENT DATA"
    assert result.confidence == "LOW"
    assert result.deterioration_score is None


def test_risk_detects_deterioration():
    result = compute_risk(
        {
            "liquidity_usd": 7000,
            "volume_1h_usd": 500,
            "holder_count": 85,
            "top10_pct": 28,
            "buy_pressure": 35,
        },
        [
            {"holder_count": 100, "top10_pct": 20},
            {"holder_count": 105, "top10_pct": 19},
        ],
        [
            {
                "liquidity_usd": 10000,
                "volume_1h_usd": 1000,
                "buy_pressure": 60,
            },
            {
                "liquidity_usd": 11000,
                "volume_1h_usd": 1200,
                "buy_pressure": 65,
            },
        ],
    )
    assert result.deterioration_score is not None
    assert result.severity in {"WATCH", "DETERIORATING", "SEVERE"}
    assert result.evidence
