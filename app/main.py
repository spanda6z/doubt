"""
Doubt — Solana meme token discovery (Week 1 API).
DISCOVERY ONLY. No execution. No wallet. No custody.
"""

from __future__ import annotations

import asyncio
import logging
import re
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.cache import check_redis, get_cached_verdict, set_cached_verdict
from app.config import get_settings
from app.data import get_token_overview
from app.scoring.flow_engine import compute_flow
from app.scoring.holder_engine import compute_holders
from app.scoring.dev_engine import compute_dev
from app.scoring.death_engine import compute_risk
from app.data.birdeye import get_token_history
from app.data.helius import get_recent_token_transactions, get_recent_address_transactions, get_token_accounts, get_token_metadata
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


@app.get("/v1/flow/{mint}")
async def get_flow(mint: str) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")

    overview, transactions = await __import__("asyncio").gather(
        get_token_overview(mint),
        get_recent_token_transactions(mint, limit=100),
    )
    flow = compute_flow(transactions, mint, overview["price_usd"])

    try:
        from sqlalchemy import text
        from app.db import get_session

        async for session in get_session():
            await session.execute(
                text("""
                    INSERT INTO flow_snapshots
                      (token_address, buys, sells, buy_volume_usd, sell_volume_usd,
                       unique_buyers, unique_sellers, net_flow_usd, buy_pressure,
                       confidence, source, liquidity_usd, volume_1h_usd, volume_24h_usd)
                    VALUES
                      (:token_address, :buys, :sells, :buy_volume_usd, :sell_volume_usd,
                       :unique_buyers, :unique_sellers, :net_flow_usd, :buy_pressure,
                       :confidence, :source, :liquidity_usd, :volume_1h_usd, :volume_24h_usd)
                """),
                {
                    "token_address": mint,
                    "buys": flow.buys,
                    "sells": flow.sells,
                    "buy_volume_usd": flow.buy_volume_usd,
                    "sell_volume_usd": flow.sell_volume_usd,
                    "unique_buyers": flow.unique_buyers,
                    "unique_sellers": flow.unique_sellers,
                    "net_flow_usd": flow.net_flow_usd,
                    "buy_pressure": flow.buy_pressure,
                    "confidence": flow.confidence,
                    "source": flow.data_source if transactions else "unavailable",
                    "liquidity_usd": overview.get("liquidity_usd"),
                    "volume_1h_usd": overview.get("volume_1h_usd"),
                    "volume_24h_usd": overview.get("volume_24h_usd"),
                },
            )
            await session.commit()
            break
    except Exception as exc:
        logger.warning("Flow snapshot persistence skipped for %s: %s", mint, exc)

    return {
        "mint": mint,
        "buys": flow.buys,
        "sells": flow.sells,
        "buy_volume_usd": flow.buy_volume_usd,
        "sell_volume_usd": flow.sell_volume_usd,
        "net_flow_usd": flow.net_flow_usd,
        "buy_pressure": flow.buy_pressure,
        "unique_buyers": flow.unique_buyers,
        "unique_sellers": flow.unique_sellers,
        "confidence": flow.confidence,
        "source": flow.data_source if transactions else "unavailable",
        "liquidity_usd": overview.get("liquidity_usd"),
        "volume_1h_usd": overview.get("volume_1h_usd"),
        "volume_24h_usd": overview.get("volume_24h_usd"),
    }


@app.get("/v1/market/{mint}/history")
async def get_market_history(mint: str, interval: str = "1m", hours: int = 24) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")
    allowed = {"1m", "5m", "15m", "30m", "1H"}
    if interval not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported interval.")
    hours = max(1, min(hours, 168))
    now = int(__import__("time").time())
    candles = await get_token_history(mint, interval, now - hours * 3600, now)
    return {
        "mint": mint,
        "interval": interval,
        "hours": hours,
        "candles": candles,
        "available": bool(candles),
        "source": "birdeye_ohlcv" if candles else "unavailable",
    }


@app.get("/v1/flow/{mint}/history")
async def get_flow_history(mint: str, limit: int = 12) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")
    limit = max(1, min(limit, 50))
    try:
        from sqlalchemy import text
        from app.db import get_session

        rows = []
        async for session in get_session():
            result = await session.execute(
                text("""
                    SELECT ts, buys, sells, buy_volume_usd, sell_volume_usd,
                           net_flow_usd, buy_pressure, unique_buyers,
                           unique_sellers, liquidity_usd, volume_1h_usd,
                           volume_24h_usd, confidence, source
                    FROM flow_snapshots
                    WHERE token_address = :token_address
                    ORDER BY ts DESC
                    LIMIT :limit
                """),
                {"token_address": mint, "limit": limit},
            )
            rows = [dict(row._mapping) for row in result.fetchall()]
            break
        return {"mint": mint, "snapshots": rows, "available": bool(rows)}
    except Exception as exc:
        logger.warning("Flow history unavailable for %s: %s", mint, exc)
        return {"mint": mint, "snapshots": [], "available": False}


@app.get("/v1/risk/{mint}")
async def get_risk(mint: str, limit: int = 12) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")
    limit = max(2, min(limit, 50))

    overview, flow_history, holder_history = await asyncio.gather(
        get_token_overview(mint),
        get_flow_history(mint, limit),
        get_holder_history(mint, limit),
    )

    transactions = await get_recent_token_transactions(mint, limit=100)
    flow = compute_flow(transactions, mint, overview["price_usd"])
    holder_accounts = await get_token_accounts(mint, limit=1000)
    holders = compute_holders(holder_accounts)

    result = compute_risk(
        {
            "liquidity_usd": overview.get("liquidity_usd"),
            "volume_1h_usd": overview.get("volume_1h_usd"),
            "holder_count": holders.holder_count,
            "top10_pct": holders.top10_pct,
            "buy_pressure": flow.buy_pressure,
        },
        holder_history.get("snapshots", []),
        flow_history.get("snapshots", []),
    )
    return {
        "mint": mint,
        "severity": result.severity,
        "deterioration_score": result.deterioration_score,
        "confidence": result.confidence,
        "liquidity_change_pct": result.liquidity_change_pct,
        "volume_change_pct": result.volume_change_pct,
        "holder_change_pct": result.holder_change_pct,
        "concentration_change_pct": result.concentration_change_pct,
        "sell_pressure_change": result.sell_pressure_change,
        "exit_impact_change_pct": result.exit_impact_change_pct,
        "evidence": result.evidence,
        "source": result.source,
        "history": {
            "flow": flow_history.get("snapshots", []),
            "holders": holder_history.get("snapshots", []),
        },
    }



@app.get("/v1/holders/{mint}")
async def get_holders(mint: str) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")

    accounts = await get_token_accounts(mint, limit=1000)
    holders = compute_holders(accounts)

    try:
        from sqlalchemy import text
        from app.db import get_session

        async for session in get_session():
            await session.execute(
                text("""
                    INSERT INTO holder_snapshots
                      (token_address, holder_count, top10_pct, top20_pct, source)
                    VALUES
                      (:token_address, :holder_count, :top10_pct, :top20_pct, :source)
                """),
                {
                    "token_address": mint,
                    "holder_count": holders.holder_count,
                    "top10_pct": holders.top10_pct,
                    "top20_pct": holders.top20_pct,
                    "source": holders.source,
                },
            )
            await session.commit()
            break
    except Exception as exc:
        logger.warning("Holder snapshot persistence skipped for %s: %s", mint, exc)

    return {
        "mint": mint,
        "holder_count": holders.holder_count,
        "top10_pct": holders.top10_pct,
        "top20_pct": holders.top20_pct,
        "top25_pct": holders.top25_pct,
        "largest": [
            {"rank": r.rank, "owner": r.owner, "amount": r.amount, "pct": r.pct}
            for r in holders.largest
        ],
        "observed_supply": holders.observed_supply,
        "confidence": holders.confidence,
        "source": holders.source if accounts else "unavailable",
    }



@app.get("/v1/holders/{mint}/history")
async def get_holder_history(mint: str, limit: int = 12) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")
    limit = max(1, min(limit, 50))

    try:
        from sqlalchemy import text
        from app.db import get_session

        rows = []
        async for session in get_session():
            result = await session.execute(
                text("""
                    SELECT ts, holder_count, top10_pct, top20_pct, source
                    FROM holder_snapshots
                    WHERE token_address = :token_address
                    ORDER BY ts DESC
                    LIMIT :limit
                """),
                {"token_address": mint, "limit": limit},
            )
            rows = [dict(row._mapping) for row in result.fetchall()]
            break
        return {"mint": mint, "snapshots": rows, "available": bool(rows)}
    except Exception as exc:
        logger.warning("Holder history unavailable for %s: %s", mint, exc)
        return {"mint": mint, "snapshots": [], "available": False}


@app.get("/v1/dev/{mint}")
async def get_dev_trace(mint: str) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")

    metadata, transactions = await asyncio.gather(
        get_token_metadata(mint),
        get_recent_token_transactions(mint, limit=100),
    )
    dev = compute_dev(metadata, transactions, mint)

    return {
        "mint": mint,
        "creator_candidate": dev.creator_candidate,
        "authority_addresses": dev.authority_addresses,
        "observed_related_mints": dev.observed_related_mints,
        "earliest_observed_signature": dev.earliest_observed_signature,
        "confidence": dev.confidence,
        "source": dev.source if (metadata.get("raw") or transactions) else "unavailable",
        "disclaimer": "Candidate creator/authority evidence only; related mints are observed activity, not confirmed launches.",
    }



@app.get("/v1/contract/{mint}")
async def get_contract(mint: str) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")

    metadata = await get_token_metadata(mint)
    authorities = metadata.get("authorities") or []
    mint_authority = None
    freeze_authority = None
    authority_rows = []

    for item in authorities:
        if not isinstance(item, dict) or not item.get("address"):
            continue
        address = str(item["address"])
        scopes = [str(x) for x in (item.get("scopes") or [])]
        authority_rows.append({"address": address, "scopes": scopes})
        joined = " ".join(scopes).lower()
        if "mint" in joined:
            mint_authority = address
        if "freeze" in joined:
            freeze_authority = address

    token_info = (metadata.get("raw") or {}).get("token_info") or {}
    token_program = token_info.get("token_program")
    mint_authority = mint_authority or token_info.get("mint_authority")
    freeze_authority = freeze_authority or token_info.get("freeze_authority")

    return {
        "mint": mint,
        "mint_authority": mint_authority,
        "freeze_authority": freeze_authority,
        "token_program": token_program,
        "authorities": authority_rows,
        "available": bool(authorities or token_program),
        "source": "helius_getAsset" if metadata.get("raw") else "unavailable",
    }



@app.get("/v1/wallet/{address}")
async def get_wallet(address: str, limit: int = 100) -> dict[str, Any]:
    address = address.strip()
    if not re.match(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$", address):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana wallet address.")
    limit = max(1, min(limit, 100))
    transactions = await get_recent_address_transactions(address, limit=limit)
    activity: list[dict[str, Any]] = []
    token_map: dict[str, dict[str, Any]] = {}
    for tx in transactions:
        if not isinstance(tx, dict):
            continue
        signature = str(tx.get("signature") or tx.get("transactionSignature") or "")
        timestamp = tx.get("timestamp") or tx.get("blockTime")
        try:
            timestamp = int(timestamp) if timestamp is not None else None
        except (TypeError, ValueError):
            timestamp = None
        description = str(tx.get("description") or "Observed transaction")
        is_swap = "swap" in description.lower()
        found_transfer = False
        for transfer in tx.get("tokenTransfers") or []:
            if not isinstance(transfer, dict):
                continue
            mint = transfer.get("mint")
            if not mint or mint == "So11111111111111111111111111111111111111112":
                continue
            incoming = str(transfer.get("toUserAccount") or "") == address
            outgoing = str(transfer.get("fromUserAccount") or "") == address
            if not (incoming or outgoing):
                continue
            found_transfer = True
            kind = "BUY" if is_swap and incoming else "SELL" if is_swap and outgoing else "RECEIVE" if incoming else "SEND"
            item = token_map.setdefault(str(mint), {"mint": str(mint), "buys": 0, "sells": 0, "receives": 0, "sends": 0, "observations": 0, "first_seen": timestamp, "last_seen": timestamp})
            item["observations"] += 1
            if timestamp is not None:
                item["first_seen"] = timestamp if item["first_seen"] is None else min(item["first_seen"], timestamp)
                item["last_seen"] = timestamp if item["last_seen"] is None else max(item["last_seen"], timestamp)
            item[{"BUY":"buys","SELL":"sells","RECEIVE":"receives","SEND":"sends"}[kind]] += 1
            activity.append({"signature": signature, "timestamp": timestamp, "kind": kind, "mint": str(mint), "amount": transfer.get("tokenAmount"), "description": description})
        if not found_transfer and signature:
            activity.append({"signature": signature, "timestamp": timestamp, "kind": "SWAP" if is_swap else "TRANSACTION", "mint": None, "amount": None, "description": description})
    activity.sort(key=lambda x: x.get("timestamp") or 0, reverse=True)
    tokens = sorted(token_map.values(), key=lambda x: x.get("last_seen") or 0, reverse=True)
    times = [x["timestamp"] for x in activity if x.get("timestamp") is not None]
    buys = sum(1 for x in activity if x["kind"] == "BUY")
    sells = sum(1 for x in activity if x["kind"] == "SELL")
    return {"address": address, "available": bool(transactions), "transactions": len(transactions), "unique_tokens": len(tokens), "buys": buys, "sells": sells, "first_seen": min(times) if times else None, "last_seen": max(times) if times else None, "confidence": "HIGH" if len(transactions) >= 50 else "MEDIUM" if len(transactions) >= 10 else "LOW", "source": "helius_enhanced_transactions" if transactions else "unavailable", "tokens": tokens[:100], "activity": activity[:100]}


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
