from app.scoring.alert_engine import build_alerts


def test_builds_flow_alerts_without_prediction():
    alerts = build_alerts([
        {
            "window": "15m",
            "available": True,
            "signals": ["SELLING_ACCELERATING", "BUY_PRESSURE_FALLING"],
            "changes": {"sell_volume_pct": 22.5, "buy_pressure_pp": -4.0},
            "confidence": "HIGH",
            "source": "flow_snapshots",
        }
    ])

    assert len(alerts) == 2
    assert {a["signal"] for a in alerts} == {"SELLING_ACCELERATING", "BUY_PRESSURE_FALLING"}
    assert all(a["type"] == "FLOW_CHANGE" for a in alerts)


def test_insufficient_data_does_not_alert():
    alerts = build_alerts([
        {
            "window": "1h",
            "available": False,
            "signals": ["INSUFFICIENT_DATA"],
        }
    ])
    assert alerts == []


def test_risk_alert_is_observational():
    alerts = build_alerts([], {
        "severity": "DETERIORATING",
        "confidence": "MEDIUM",
        "source": "risk_engine",
        "evidence": [{"detail": "Liquidity changed -18%."}],
    })
    assert alerts[0]["type"] == "RISK_STATE"
    assert alerts[0]["signal"] == "DETERIORATING"
