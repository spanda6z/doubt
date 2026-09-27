"""
Observed Flow Engine.

This intentionally does NOT label wallets as "smart money" without a wallet
classification model. It measures only observable recent token activity.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class FlowOutputs:
    buys: int
    sells: int
    buy_volume_usd: float
    sell_volume_usd: float
    unique_buyers: int
    unique_sellers: int
    net_flow_usd: float
    buy_pressure: float
    flow_score: int
    confidence: str
    data_source: str


def _token_transfers(tx: dict[str, Any], mint: str) -> list[dict[str, Any]]:
    return [x for x in (tx.get("tokenTransfers") or []) if x.get("mint") == mint]


def _classify(tx: dict[str, Any], mint: str) -> str | None:
    desc = (tx.get("description") or "").lower()
    if "swap" in desc:
        if " sol for " in desc or "sol for" in desc:
            return "buy"
        if " for sol" in desc or "for sol" in desc:
            return "sell"

    transfers = _token_transfers(tx, mint)
    if not transfers:
        return None

    # Fallback: a swap that increases token balance for a wallet is treated as buy.
    # We only use this for aggregate flow; no wallet is labeled smart.
    incoming = sum(float(x.get("tokenAmount") or x.get("uiTokenAmount") or 0) for x in transfers if x.get("toUserAccount"))
    outgoing = sum(float(x.get("tokenAmount") or x.get("uiTokenAmount") or 0) for x in transfers if x.get("fromUserAccount"))
    if incoming > outgoing:
        return "buy"
    if outgoing > incoming:
        return "sell"
    return None


def compute_flow(transactions: list[dict[str, Any]], mint: str, price_usd: float) -> FlowOutputs:
    buys = sells = 0
    buy_volume = sell_volume = 0.0
    buyers: set[str] = set()
    sellers: set[str] = set()

    for tx in transactions:
        kind = _classify(tx, mint)
        transfers = _token_transfers(tx, mint)
        if not kind or not transfers:
            continue

        token_amount = sum(float(x.get("tokenAmount") or 0) for x in transfers)
        usd = max(0.0, token_amount * max(price_usd, 0.0))

        if kind == "buy":
            buys += 1
            buy_volume += usd
            for x in transfers:
                if x.get("toUserAccount"):
                    buyers.add(x["toUserAccount"])
        else:
            sells += 1
            sell_volume += usd
            for x in transfers:
                if x.get("fromUserAccount"):
                    sellers.add(x["fromUserAccount"])

    total = buy_volume + sell_volume
    pressure = (buy_volume / total * 100.0) if total else 50.0
    net = buy_volume - sell_volume
    score = int(round(pressure))
    confidence = "HIGH" if (buys + sells) >= 30 else "MEDIUM" if (buys + sells) >= 8 else "LOW"

    return FlowOutputs(
        buys=buys,
        sells=sells,
        buy_volume_usd=round(buy_volume, 2),
        sell_volume_usd=round(sell_volume, 2),
        unique_buyers=len(buyers),
        unique_sellers=len(sellers),
        net_flow_usd=round(net, 2),
        buy_pressure=round(pressure, 2),
        flow_score=max(0, min(100, score)),
        confidence=confidence,
        data_source="helius_enhanced_transactions",
    )
