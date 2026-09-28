from __future__ import annotations

from typing import Any


FLOW_ALERT_SIGNALS = {
    "SELLING_ACCELERATING",
    "BUYER_COUNT_CONTRACTING",
    "SELLER_COUNT_EXPANDING",
    "NET_FLOW_REVERSAL",
    "BUY_PRESSURE_FALLING",
}

RISK_ALERT_STATES = {"WATCH", "DETERIORATING", "SEVERE"}


def build_alerts(
    flow_timeline: list[dict[str, Any]],
    risk: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """
    Convert observed state changes into factual research alerts.

    This is deliberately not a trade signal. It reports changes already
    observed in persisted flow/risk data and preserves insufficient-data states.
    """
    alerts: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()

    for row in flow_timeline:
        if not row.get("available"):
            continue
        window = str(row.get("window") or "")
        changes = row.get("changes") or {}
        for signal in row.get("signals") or []:
            if signal not in FLOW_ALERT_SIGNALS:
                continue
            key = (window, signal)
            if key in seen:
                continue
            seen.add(key)

            title = {
                "SELLING_ACCELERATING": "Selling volume accelerating",
                "BUYER_COUNT_CONTRACTING": "Buyer count contracting",
                "SELLER_COUNT_EXPANDING": "Seller count expanding",
                "NET_FLOW_REVERSAL": "Net flow reversed",
                "BUY_PRESSURE_FALLING": "Buy pressure falling",
            }[signal]

            detail = f"Observed over {window}."
            if signal == "BUY_PRESSURE_FALLING" and changes.get("buy_pressure_pp") is not None:
                detail = f"Observed buy pressure changed {float(changes['buy_pressure_pp']):+.1f} percentage points over {window}."
            elif signal == "SELLING_ACCELERATING" and changes.get("sell_volume_pct") is not None:
                detail = f"Observed sell volume changed {float(changes['sell_volume_pct']):+.1f}% over {window}."
            elif signal == "BUYER_COUNT_CONTRACTING" and changes.get("unique_buyers") is not None:
                detail = f"Observed buyer count changed {int(changes['unique_buyers']):+d} over {window}."
            elif signal == "SELLER_COUNT_EXPANDING" and changes.get("unique_sellers") is not None:
                detail = f"Observed seller count changed {int(changes['unique_sellers']):+d} over {window}."
            elif signal == "NET_FLOW_REVERSAL":
                detail = f"Observed net flow changed sign over {window}."

            alerts.append({
                "type": "FLOW_CHANGE",
                "signal": signal,
                "window": window,
                "severity": "medium",
                "title": title,
                "detail": detail,
                "source": row.get("source") or "flow_snapshots",
                "confidence": row.get("confidence") or "LOW",
            })

    if risk:
        severity = str(risk.get("severity") or "INSUFFICIENT DATA")
        if severity in RISK_ALERT_STATES:
            key = ("risk", severity)
            if key not in seen:
                evidence = risk.get("evidence") or []
                alerts.append({
                    "type": "RISK_STATE",
                    "signal": severity,
                    "window": None,
                    "severity": severity.lower(),
                    "title": f"Observed risk state: {severity}",
                    "detail": (
                        evidence[0].get("detail")
                        if evidence and isinstance(evidence[0], dict) and evidence[0].get("detail")
                        else "The current observable risk state is above stable."
                    ),
                    "source": risk.get("source") or "risk_engine",
                    "confidence": risk.get("confidence") or "LOW",
                })

    order = {"severe": 0, "high": 1, "medium": 2, "low": 3}
    alerts.sort(key=lambda x: (order.get(str(x.get("severity")), 9), str(x.get("window") or "")))
    return alerts
