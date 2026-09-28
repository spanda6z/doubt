from __future__ import annotations

import asyncio
import re
from typing import Any

from fastapi import APIRouter, HTTPException

from app.data import get_token_overview
from app.data.helius import get_recent_token_transactions, get_token_accounts
from app.db import get_session
from app.scoring.alert_engine import build_alerts
from app.scoring.death_engine import compute_risk
from app.scoring.flow_engine import compute_flow
from app.scoring.flow_timeline import WINDOWS_SECONDS, build_flow_timeline
from app.scoring.holder_engine import compute_holders

router = APIRouter(prefix="/v1/alerts", tags=["alerts"])
MINT_RE = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")


async def _flow_history(mint: str, limit: int) -> list[dict[str, Any]]:
    from sqlalchemy import text

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
        return [dict(row._mapping) for row in result.fetchall()]
    return []


async def _holder_history(mint: str, limit: int) -> list[dict[str, Any]]:
    from sqlalchemy import text

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
        return [dict(row._mapping) for row in result.fetchall()]
    return []


@router.get("/{mint}")
async def get_alerts(mint: str, limit: int = 50) -> dict[str, Any]:
    mint = mint.strip()
    if not MINT_RE.match(mint):
        raise HTTPException(status_code=400, detail="That doesn't look like a Solana mint address.")
    limit = max(2, min(limit, 100))

    try:
        overview, transactions, flow_history, holder_history, holder_accounts = await asyncio.gather(
            get_token_overview(mint),
            get_recent_token_transactions(mint, limit=100),
            _flow_history(mint, limit),
            _holder_history(mint, limit),
            get_token_accounts(mint, limit=1000),
        )

        flow = compute_flow(transactions, mint, overview.get("price_usd"))
        holders = compute_holders(holder_accounts)
        risk_result = compute_risk(
            {
                "liquidity_usd": overview.get("liquidity_usd"),
                "volume_1h_usd": overview.get("volume_1h_usd"),
                "holder_count": holders.holder_count,
                "top10_pct": holders.top10_pct,
                "buy_pressure": flow.buy_pressure,
            },
            holder_history,
            flow_history,
        )

        timeline = build_flow_timeline(flow_history, list(WINDOWS_SECONDS.keys()))
        risk = {
            "severity": risk_result.severity,
            "confidence": risk_result.confidence,
            "source": risk_result.source,
            "evidence": risk_result.evidence,
        }
        alerts = build_alerts(timeline, risk)

        return {
            "mint": mint,
            "available": bool(alerts),
            "alerts": alerts[:limit],
            "count": len(alerts),
            "flow_timeline_available": any(row.get("available") for row in timeline),
            "risk_state": risk_result.severity,
            "source": "flow_snapshots+risk_engine",
        }
    except Exception as exc:
        return {
            "mint": mint,
            "available": False,
            "alerts": [],
            "count": 0,
            "flow_timeline_available": False,
            "risk_state": "INSUFFICIENT DATA",
            "source": "unavailable",
            "reason": "Observable alert data is unavailable.",
        }
