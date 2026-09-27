"""
Helius DAS + RPC helpers.
Week 1: fetch token metadata via DAS getAsset.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


async def get_token_metadata(mint: str) -> dict[str, Any]:
    """
    Fetch token metadata via Helius DAS getAsset.
    Returns a normalized dict or empty on failure.
    """
    settings = get_settings()
    if not settings.helius_api_key:
        logger.warning("HELIUS_API_KEY not set — returning stub metadata")
        return _stub_metadata(mint)

    url = f"https://mainnet.helius-rpc.com/?api-key={settings.helius_api_key}"
    payload = {
        "jsonrpc": "2.0",
        "id": "doubt-get-asset",
        "method": "getAsset",
        "params": {"id": mint},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.exception("Helius getAsset failed for %s: %s", mint, e)
        return _stub_metadata(mint)

    result = data.get("result") or {}
    content = result.get("content") or {}
    metadata = content.get("metadata") or {}
    links = content.get("links") or {}
    token_info = result.get("token_info") or {}

    return {
        "mint": mint,
        "symbol": metadata.get("symbol") or token_info.get("symbol") or "UNKNOWN",
        "name": metadata.get("name") or "Unknown Token",
        "image_url": links.get("image") or content.get("json_uri"),
        "decimals": token_info.get("decimals", 6),
        "supply": token_info.get("supply"),
        "raw": result,
    }


def _stub_metadata(mint: str) -> dict[str, Any]:
    return {
        "mint": mint,
        "symbol": "STUB",
        "name": "Stub Token (no Helius key)",
        "image_url": None,
        "decimals": 6,
        "supply": None,
        "raw": {},
    }
