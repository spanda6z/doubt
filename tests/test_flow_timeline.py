from app.scoring.flow_timeline import build_flow_timeline


def snap(ts, pressure, net, buyers, sellers, buy_volume=100, sell_volume=100):
    return {
        "ts": ts,
        "buy_pressure": pressure,
        "net_flow_usd": net,
        "unique_buyers": buyers,
        "unique_sellers": sellers,
        "buy_volume_usd": buy_volume,
        "sell_volume_usd": sell_volume,
        "confidence": "HIGH",
        "source": "test",
    }


def test_rising_buy_pressure_and_buying_acceleration():
    rows = build_flow_timeline(
        [
            snap("2026-01-01T00:00:00+00:00", 40, -100, 20, 10, 100, 100),
            snap("2026-01-01T00:05:00+00:00", 55, 150, 25, 9, 130, 100),
        ],
        ["5m"],
    )
    assert rows[0]["available"] is True
    assert "BUY_PRESSURE_RISING" in rows[0]["signals"]
    assert "BUYING_ACCELERATING" in rows[0]["signals"]
    assert "NET_FLOW_REVERSAL" in rows[0]["signals"]


def test_selling_acceleration_and_holder_flow_counts():
    rows = build_flow_timeline(
        [
            snap("2026-01-01T00:00:00+00:00", 60, 200, 30, 8, 100, 100),
            snap("2026-01-01T00:05:00+00:00", 55, -50, 24, 12, 100, 140),
        ],
        ["5m"],
    )
    assert "SELLING_ACCELERATING" in rows[0]["signals"]
    assert "BUYER_COUNT_CONTRACTING" in rows[0]["signals"]
    assert "SELLER_COUNT_EXPANDING" in rows[0]["signals"]
    assert "NET_FLOW_REVERSAL" in rows[0]["signals"]


def test_insufficient_history_is_explicit():
    rows = build_flow_timeline(
        [snap("2026-01-01T00:00:00+00:00", 50, 0, 10, 10)],
        ["5m", "1h"],
    )
    assert all(row["available"] is False for row in rows)
    assert all(row["signals"] == ["INSUFFICIENT_DATA"] for row in rows)
