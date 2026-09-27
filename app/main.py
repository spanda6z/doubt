"""
Doubt — Solana meme token discovery (Week 1 API).
DISCOVERY ONLY. No execution. No wallet. No custody.
"""

from __future__ import annotations

import logging
import re
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.cache import check_redis, get_cached_verdict, set_cached_verdict
from app.config import get_settings
from app.db import check_db
from app.models import HealthResponse, VerdictResponse, WebhookAck
from app.rate_limit import verdict_limiter
from app.services.verdict import build_verdict

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Solana mint: base58, typically 32-44 chars
MINT_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logger.info("Starting %s (env=%s)", settings.app_name, settings.app_env)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title="Doubt API",
    description="Exit math before the entry. Discovery only.",
    version="0.1.1",
    default_response_class=ORJSONResponse,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in prod
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse()


@app.get("/health/deps")
async def health_deps() -> dict[str, Any]:
    return {
        "db": await check_db(),
        "redis": await check_redis(),
    }


@app.get("/v1/verdict/{mint}", response_model=VerdictResponse)
async def get_verdict(mint: str, request: Request) -> VerdictResponse:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(
            status_code=400,
            detail="That doesn't look like a Solana mint address.",
        )

    client = request.client.host if request.client else "unknown"
    if not verdict_limiter.allow(client):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Try again in a minute.",
        )

    settings = get_settings()

    # Cache first
    cached = await get_cached_verdict(mint)
    if cached:
        return VerdictResponse.model_validate(cached)

    try:
        verdict = await build_verdict(mint)
    except Exception as e:
        logger.exception("Verdict build failed for %s", mint)
        raise HTTPException(
            status_code=502, detail="Upstream data unavailable"
        ) from e

    payload = verdict.model_dump(mode="json")
    await set_cached_verdict(mint, payload, ttl=settings.verdict_ttl_seconds)
    return verdict


@app.post("/webhooks/helius", response_model=WebhookAck)
async def helius_webhook(request: Request) -> WebhookAck:
    """
    Empty handler for Week 1.
    Helius will POST account / enhanced tx webhooks here.
    """
    try:
        body = await request.json()
        count = len(body) if isinstance(body, list) else 1
        logger.info("Helius webhook received (%s items)", count)
    except Exception:
        logger.warning("Helius webhook: could not parse body")
        count = 0
    return WebhookAck(received=True, processed=0)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "service": "doubt",
        "tagline": "The exit math before the entry.",
        "docs": "/docs",
    }
