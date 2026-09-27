"""
Birdeye price / liquidity / volume helpers.
Week 1: overview endpoint for liquidity + volume.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def get_token_history(mint: str, interval: str = "1m", time_from: int | None = None, time_to: int | None = None) -> list[dict[str, Any]]:
    """Fetch historical OHLCV candles from Birdeye when configured."""
    settings = get_settings()
    if not settings.birdeye_api_key:
        return []
    url = "https://public-api.birdeye.so/defi/ohlcv"
    headers = {"X-API-KEY": settings.birdeye_api_key, "x-chain": "solana", "accept": "application/json"}
    params: dict[str, Any] = {"address": mint, "type": interval}
    if time_from is not None:
        params["time_from"] = time_from
    if time_to is not None:
        params["time_to"] = time_to
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
        items = (data.get("data") or {}).get("items") or []
        return [
            {
                "timestamp": int(x.get("unixTime") or x.get("timestamp") or 0),
                "open": float(x.get("o") or 0),
                "high": float(x.get("h") or 0),
                "low": float(x.get("l") or 0),
                "close": float(x.get("c") or 0),
                "volume": float(x.get("v") or 0),
            }
            for x in items
            if x.get("unixTime") is not None or x.get("timestamp") is not None
        ]
    except Exception as e:
        logger.warning("Birdeye OHLCV failed for %s: %s", mint, e)
        return []


async def get_token_overview(mint: str) -> dict[str, Any]:
    """
    Fetch token overview from Birdeye.
    Returns normalized metrics or stub on failure / missing key.
    """
    settings = get_settings()
    if not settings.birdeye_api_key:
        logger.warning("BIRDEYE_API_KEY not set — returning stub overview")
        return _stub_overview(mint)

    url = "https://public-api.birdeye.so/defi/token_overview"
    headers = {
        "X-API-KEY": settings.birdeye_api_key,
        "x-chain": "solana",
        "accept": "application/json",
    }
    params = {"address": mint}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.exception("Birdeye overview failed for %s: %s", mint, e)
        return _stub_overview(mint)

    d = data.get("data") or {}
    return {
        "mint": mint,
        "price_usd": float(d.get("price") or 0),
        "market_cap_usd": float(d.get("mc") or 0),
        "liquidity_usd": float(d.get("liquidity") or 0),
        "volume_1h_usd": float(d.get("v1hUSD") or d.get("v1h") or 0),
        "volume_24h_usd": float(d.get("v24hUSD") or d.get("v24h") or 0),
        "holder": int(d.get("holder") or 0),
        "trade_1h": int(d.get("trade1h") or 0),
        "raw": d,
    }


def _stub_overview(mint: str) -> dict[str, Any]:
    """Deterministic stub so local testing is stable."""
    seed = sum(ord(c) for c in mint[-6:]) % 100
    liq = 8000 + seed * 120
    return {
        "mint": mint,
        "price_usd": 0.00012 + seed * 0.00001,
        "market_cap_usd": liq * 8,
        "liquidity_usd": float(liq),
        "volume_1h_usd": float(1200 + seed * 40),
        "volume_24h_usd": float(18000 + seed * 300),
        "holder": 400 + seed * 3,
        "trade_1h": 30 + seed % 20,
        "raw": {"stub": True},
    }
