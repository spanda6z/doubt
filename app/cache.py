"""
Redis cache for verdicts (TTL 30s).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Optional

import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[redis.Redis] = None


async def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        settings = get_settings()
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


async def get_cached_verdict(mint: str) -> Optional[dict[str, Any]]:
    try:
        r = await get_redis()
        raw = await r.get(f"verdict:{mint}")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.warning("Redis get failed: %s", e)
    return None


async def set_cached_verdict(mint: str, data: dict[str, Any], ttl: int = 30) -> None:
    try:
        r = await get_redis()
        await r.setex(f"verdict:{mint}", ttl, json.dumps(data, default=str))
    except Exception as e:
        logger.warning("Redis set failed: %s", e)


async def check_redis() -> bool:
    try:
        r = await get_redis()
        return bool(await r.ping())
    except Exception as e:
        logger.warning("Redis health check failed: %s", e)
        return False
