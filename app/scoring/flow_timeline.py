from __future__ import annotations

from datetime import datetime
from typing import Any


WINDOWS_SECONDS = {
    "5m": 5 * 60,
    "15m": 15 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
}


def _ts(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.timestamp()
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return None
    return None


def _pct_change(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous == 0:
        return None
    return ((current - previous) / abs(previous)) * 100.0


def _signals(current: dict[str, Any], previous: dict[str, Any]) -> list[str]:
    signals: list[str] = []

    bp_now = current.get("buy_pressure")
    bp_prev = previous.get("buy_pressure")
    if isinstance(bp_now, (int, float)) and isinstance(bp_prev, (int, float)):
        delta = float(bp_now) - float(bp_prev)
        if delta >= 2:
            signals.append("BUY_PRESSURE_RISING")
        elif delta <= -2:
            signals.append("BUY_PRESSURE_FALLING")

    buy_now = current.get("buy_volume_usd")
    buy_prev = previous.get("buy_volume_usd")
    if isinstance(buy_now, (int, float)) and isinstance(buy_prev, (int, float)) and buy_prev > 0:
        if (float(buy_now) - float(buy_prev)) / float(buy_prev) >= 0.10:
            signals.append("BUYING_ACCELERATING")

    sell_now = current.get("sell_volume_usd")
    sell_prev = previous.get("sell_volume_usd")
    if isinstance(sell_now, (int, float)) and isinstance(sell_prev, (int, float)) and sell_prev > 0:
        if (float(sell_now) - float(sell_prev)) / float(sell_prev) >= 0.10:
            signals.append("SELLING_ACCELERATING")

    buyers_now = current.get("unique_buyers")
    buyers_prev = previous.get("unique_buyers")
    if isinstance(buyers_now, (int, float)) and isinstance(buyers_prev, (int, float)):
        if buyers_now < buyers_prev:
            signals.append("BUYER_COUNT_CONTRACTING")

    sellers_now = current.get("unique_sellers")
    sellers_prev = previous.get("unique_sellers")
    if isinstance(sellers_now, (int, float)) and isinstance(sellers_prev, (int, float)):
        if sellers_now > sellers_prev:
            signals.append("SELLER_COUNT_EXPANDING")

    net_now = current.get("net_flow_usd")
    net_prev = previous.get("net_flow_usd")
    if isinstance(net_now, (int, float)) and isinstance(net_prev, (int, float)):
        if (float(net_now) > 0 > float(net_prev)) or (float(net_now) < 0 < float(net_prev)):
            signals.append("NET_FLOW_REVERSAL")

    return signals or ["INSUFFICIENT_DATA"]


def build_flow_timeline(snapshots: list[dict[str, Any]], windows: list[str]) -> list[dict[str, Any]]:
    rows = []
    clean = [row for row in snapshots if _ts(row.get("ts")) is not None]
    clean.sort(key=lambda row: _ts(row.get("ts")) or 0)

    if not clean:
        return [
            {"window": window, "available": False, "signals": ["INSUFFICIENT_DATA"], "reason": "No persisted flow snapshots."}
            for window in windows
        ]

    current = clean[-1]
    current_ts = _ts(current.get("ts"))

    for window in windows:
        seconds = WINDOWS_SECONDS.get(window)
        if seconds is None or current_ts is None:
            rows.append({"window": window, "available": False, "signals": ["INSUFFICIENT_DATA"], "reason": "Unsupported window."})
            continue

        target = current_ts - seconds
        previous = None
        for candidate in reversed(clean[:-1]):
            candidate_ts = _ts(candidate.get("ts"))
            if candidate_ts is not None and candidate_ts <= target:
                previous = candidate
                break

        base = {
            "window": window,
            "available": previous is not None,
            "current_ts": current.get("ts"),
            "previous_ts": previous.get("ts") if previous else None,
            "buy_pressure": current.get("buy_pressure"),
            "net_flow_usd": current.get("net_flow_usd"),
            "unique_buyers": current.get("unique_buyers"),
            "unique_sellers": current.get("unique_sellers"),
            "buy_volume_usd": current.get("buy_volume_usd"),
            "sell_volume_usd": current.get("sell_volume_usd"),
            "confidence": current.get("confidence"),
            "source": current.get("source"),
        }

        if previous is None:
            base.update({
                "signals": ["INSUFFICIENT_DATA"],
                "reason": f"No snapshot at least {window} before the latest observation.",
                "changes": {},
            })
        else:
            base.update({
                "signals": _signals(current, previous),
                "changes": {
                    "buy_pressure_pp": (
                        float(current["buy_pressure"]) - float(previous["buy_pressure"])
                        if isinstance(current.get("buy_pressure"), (int, float))
                        and isinstance(previous.get("buy_pressure"), (int, float))
                        else None
                    ),
                    "net_flow_usd": (
                        float(current["net_flow_usd"]) - float(previous["net_flow_usd"])
                        if isinstance(current.get("net_flow_usd"), (int, float))
                        and isinstance(previous.get("net_flow_usd"), (int, float))
                        else None
                    ),
                    "buy_volume_pct": _pct_change(current.get("buy_volume_usd"), previous.get("buy_volume_usd")),
                    "sell_volume_pct": _pct_change(current.get("sell_volume_usd"), previous.get("sell_volume_usd")),
                    "unique_buyers": (
                        current.get("unique_buyers") - previous.get("unique_buyers")
                        if isinstance(current.get("unique_buyers"), (int, float))
                        and isinstance(previous.get("unique_buyers"), (int, float))
                        else None
                    ),
                    "unique_sellers": (
                        current.get("unique_sellers") - previous.get("unique_sellers")
                        if isinstance(current.get("unique_sellers"), (int, float))
                        and isinstance(previous.get("unique_sellers"), (int, float))
                        else None
                    ),
                },
            })
        rows.append(base)

    return rows
