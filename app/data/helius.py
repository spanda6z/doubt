"""
Helius DAS + Enhanced Transactions helpers.
Discovery only: metadata, recent token activity, and holder accounts.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


def _rpc_url(api_key: str) -> str:
    return f"https://mainnet.helius-rpc.com/?api-key={api_key}"


async def get_token_metadata(mint: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.helius_api_key:
        logger.warning("HELIUS_API_KEY not set — returning stub metadata")
        return _stub_metadata(mint)

    payload = {
        "jsonrpc": "2.0",
        "id": "doubt-get-asset",
        "method": "getAsset",
        "params": {"id": mint},
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(_rpc_url(settings.helius_api_key), json=payload)
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
        "authorities": result.get("authorities") or [],
        "ownership": result.get("ownership") or {},
        "raw": result,
    }


async def get_token_accounts(mint: str, limit: int = 1000) -> list[dict[str, Any]]:
    """Return the first holder page. Aggregation is by owner, not token account."""
    settings = get_settings()
    if not settings.helius_api_key:
        return []

    payload = {
        "jsonrpc": "2.0",
        "id": "doubt-token-accounts",
        "method": "getTokenAccounts",
        "params": {"mint": mint, "page": 1, "limit": min(limit, 1000), "displayOptions": {}},
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(_rpc_url(settings.helius_api_key), json=payload)
            resp.raise_for_status()
            result = (resp.json().get("result") or {})
            return result.get("token_accounts") or []
    except Exception as e:
        logger.warning("Helius getTokenAccounts failed for %s: %s", mint, e)
        return []


async def get_recent_token_transactions(mint: str, limit: int = 100) -> list[dict[str, Any]]:
    """Fetch recent parsed transactions mentioning the mint."""
    settings = get_settings()
    if not settings.helius_api_key:
        return []

    url = f"https://api.helius.xyz/v0/addresses/{mint}/transactions"
    params = {"api-key": settings.helius_api_key, "limit": min(limit, 100)}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, params=params)
            resp.raise_for_status()
            data = resp.json()
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("Helius token transactions failed for %s: %s", mint, e)
        return []


def _stub_metadata(mint: str) -> dict[str, Any]:
    return {
        "mint": mint,
        "symbol": "STUB",
        "name": "Stub Token (no Helius key)",
        "image_url": None,
        "decimals": 6,
        "supply": None,
        "authorities": [],
        "ownership": {},
        "raw": {},
    }
\n\nasync def get_recent_address_transactions(address: str, limit: int = 100) -> list[dict[str, Any]]:\n    """Fetch recent parsed transactions for a wallet address."""\n    settings = get_settings()\n    if not settings.helius_api_key:\n        return []\n    url = f"https://api.helius.xyz/v0/addresses/{address}/transactions"\n    params = {"api-key": settings.helius_api_key, "limit": min(limit, 100)}\n    try:\n        async with httpx.AsyncClient(timeout=15.0) as client:\n            resp = await client.get(url, params=params)\n            resp.raise_for_status()\n            data = resp.json()\n            return data if isinstance(data, list) else []\n    except Exception as e:\n        logger.warning("Helius wallet transactions failed for %s: %s", address, e)\n        return []\n