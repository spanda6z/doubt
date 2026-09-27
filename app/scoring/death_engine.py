"""
Evidence-first deterioration / death-risk engine.

This does not claim a token is "dead". It measures changes in observable
market conditions and only emits a severity when enough historical evidence
exists.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class RiskOutputs:
    liquidity_change_pct: float | None
    volume_change_pct: float | None
    holder_change_pct: float | None
    concentration_change_pct: float | None
    sell_pressure_change: float | None
    exit_impact_change_pct: float | None
    deterioration_score: int | None
    severity: str
    confidence: str
    evidence: list[dict[str, Any]]
    source: str


def _pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return round(((current - previous) / abs(previous)) * 100.0, 2)


def _latest_previous(rows: list[dict[str, Any]], key: str) -> tuple[float | None, float | None]:
    vals = []
    for row in rows:
        value = row.get(key)
        if isinstance(value, (int, float)):
            vals.append(float(value))
    if not vals:
        return None, None
    return vals[0], vals[1] if len(vals) > 1 else None


def _impact(liquidity: float | None, size: float = 100.0) -> float | None:
    if liquidity is None or liquidity <= 0:
        return None
    return round((size / (liquidity + size)) * 100.0, 4)


def compute_risk(
    current: dict[str, Any],
    holder_history: list[dict[str, Any]],
    flow_history: list[dict[str, Any]],
) -> RiskOutputs:
    """
    Historical rows are expected newest-first. Current values are compared
    against the most recent prior snapshot, not against the current row.
    """
    liq_now = float(current.get("liquidity_usd") or 0) or None
    vol_now = float(current.get("volume_1h_usd") or 0) or None
    holders_now = float(current.get("holder_count") or 0) or None
    top10_now = current.get("top10_pct")
    pressure_now = current.get("buy_pressure")
    if pressure_now is not None:
        pressure_now = float(pressure_now)

    _, liq_prev = _latest_previous(holder_history, "liquidity_usd")
    # Liquidity is not stored in holder snapshots, so use optional enriched
    # history when present; otherwise this remains unavailable.
    if liq_prev is None:
        liq_prev = None

    _, holder_prev = _latest_previous(holder_history, "holder_count")
    _, top10_prev = _latest_previous(holder_history, "top10_pct")
    _, pressure_prev = _latest_previous(flow_history, "buy_pressure")
    _, vol_prev = _latest_previous(flow_history, "volume_1h_usd")

    # If historical rows contain liquidity, use them. Older schemas do not.
    liq_change = _pct_change(liq_now, liq_prev)
    vol_change = _pct_change(vol_now, vol_prev)
    holder_change = _pct_change(holders_now, holder_prev)
    concentration_change = _pct_change(
        float(top10_now) if top10_now is not None else None,
        top10_prev,
    )
    sell_pressure_change = (
        round((100.0 - pressure_now) - (100.0 - pressure_prev), 2)
        if pressure_now is not None and pressure_prev is not None
        else None
    )

    current_impact = _impact(liq_now)
    previous_impact = _impact(liq_prev)
    impact_change = _pct_change(current_impact, previous_impact)

    evidence: list[dict[str, Any]] = []
    penalties = 0.0
    observations = 0

    def add(metric: str, change: float | None, threshold: float, points: float, title: str, detail: str):
        nonlocal penalties, observations
        if change is None:
            return
        observations += 1
        if change <= threshold:
            penalties += points
            evidence.append({
                "metric": metric,
                "severity": "high" if change <= threshold * 1.5 else "medium",
                "title": title,
                "detail": detail,
                "change_pct": change,
            })

    add(
        "liquidity",
        liq_change,
        -20.0,
        25.0,
        "Liquidity deterioration",
        f"Liquidity changed {liq_change:+.1f}% versus the prior observed snapshot.",
    )
    add(
        "volume",
        vol_change,
        -35.0,
        20.0,
        "Volume deterioration",
        f"1h volume changed {vol_change:+.1f}% versus the prior observed snapshot.",
    )
    add(
        "holders",
        holder_change,
        -15.0,
        15.0,
        "Holder count contraction",
        f"Observed holder count changed {holder_change:+.1f}% versus the prior snapshot.",
    )
    add(
        "concentration",
        concentration_change,
        15.0,
        15.0,
        "Holder concentration increased",
        f"Top-10 concentration changed {concentration_change:+.1f}% versus the prior snapshot.",
    )
    if sell_pressure_change is not None:
        observations += 1
        if sell_pressure_change >= 15.0:
            penalties += 20.0
            evidence.append({
                "metric": "sell_pressure",
                "severity": "high" if sell_pressure_change >= 25 else "medium",
                "title": "Sell pressure increased",
                "detail": f"Sell-side pressure changed {sell_pressure_change:+.1f} percentage points.",
                "change_pct": sell_pressure_change,
            })

    if impact_change is not None and impact_change >= 25.0:
        penalties += 15.0
        evidence.append({
            "metric": "exit_impact",
            "severity": "high",
            "title": "Modeled exit impact increased",
            "detail": f"Estimated $100 exit impact changed {impact_change:+.1f}%.",
            "change_pct": impact_change,
        })

    enough_history = observations >= 2
    if not enough_history:
        severity = "INSUFFICIENT DATA"
        score = None
        confidence = "LOW"
        evidence.insert(0, {
            "metric": "history",
            "severity": "info",
            "title": "Insufficient historical evidence",
            "detail": "Risk deterioration requires multiple observed snapshots; a single snapshot is not treated as token death.",
        })
    else:
        score = max(0, min(100, int(round(penalties))))
        severity = (
            "SEVERE" if score >= 70 else
            "DETERIORATING" if score >= 45 else
            "WATCH" if score >= 20 else
            "STABLE"
        )
        confidence = "HIGH" if observations >= 4 else "MEDIUM"

    return RiskOutputs(
        liquidity_change_pct=liq_change,
        volume_change_pct=vol_change,
        holder_change_pct=holder_change,
        concentration_change_pct=concentration_change,
        sell_pressure_change=sell_pressure_change,
        exit_impact_change_pct=impact_change,
        deterioration_score=score,
        severity=severity,
        confidence=confidence,
        evidence=evidence,
        source="observed_market_plus_helius_history",
    )
