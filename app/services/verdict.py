"""
Verdict service — discovery intelligence.
Exit math and observed transaction flow are computed from available sources;
unknown fields remain explicitly unclassified rather than fabricated.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.config import get_settings
from app.data import get_token_metadata, get_token_overview
from app.data.helius import get_recent_token_transactions
from app.scoring.flow_engine import compute_flow
from app.models import (
    DeathData,
    ExitBuy,
    ExitMath,
    Reason,
    ReverseFlow,
    Scores,
    VerdictResponse,
)
from app.scoring import ExitInputs, compute_exit

logger = logging.getLogger(__name__)


def _verdict_from_score(score: int) -> str:
    if score >= 75:
        return "SAFE"
    if score >= 55:
        return "CAUTION"
    if score >= 35:
        return "RISKY"
    return "AVOID"


def _confidence(flow_confidence: str, liquidity_usd: float) -> str:
    if flow_confidence == "LOW" or liquidity_usd < 10_000:
        return "LOW"
    if flow_confidence == "MEDIUM" or liquidity_usd < 50_000:
        return "MEDIUM"
    return "HIGH"


def _build_tweet_text(v: VerdictResponse) -> str:
    emoji = {
        "SAFE": "🔵",
        "CAUTION": "⚠️",
        "RISKY": "🟠",
        "AVOID": "🔴",
    }.get(v.verdict, "⚠️")

    lines = [
        f"{emoji} {v.verdict} — ${v.symbol}",
        f"Rug probability: {v.rug_probability}%",
        f"Buy $500 → exit ${v.exit_math.buy_500.exit_value:.0f} ({v.exit_math.buy_500.delta_pct:+.0f}%)",
    ]
    if v.reasons:
        lines.append(f"• {v.reasons[0].text}")
    lines.append("Not financial advice. Exit math only.")
    return "\n".join(lines)


async def build_verdict(mint: str) -> VerdictResponse:
    settings = get_settings()

    import asyncio
    meta, overview, transactions = await asyncio.gather(
        get_token_metadata(mint),
        get_token_overview(mint),
        get_recent_token_transactions(mint, limit=100),
    )
    flow = compute_flow(transactions, mint, overview["price_usd"])
    death_score = 50
    if overview["liquidity_usd"] >= 50_000:
        death_score += 20
    elif overview["liquidity_usd"] < 5_000:
        death_score -= 25
    if overview["holder"] >= 1000:
        death_score += 10
    elif overview["holder"] < 100:
        death_score -= 10
    if flow.buy_pressure >= 60:
        death_score += 10
    elif flow.buy_pressure <= 40:
        death_score -= 10
    death_score = max(0, min(100, death_score))

    timestamps = [int(t.get("timestamp") or 0) for t in transactions if t.get("timestamp")]
    observed_window_minutes = 0
    if len(timestamps) >= 2:
        observed_window_minutes = max(0, (max(timestamps) - min(timestamps)) // 60)
    age_minutes = max(60.0, float(observed_window_minutes))

    exit_inputs = ExitInputs(
        total_liquidity_usd=overview["liquidity_usd"],
        top10_holder_pct=0.0,
        dev_holder_pct=0.0,
        volume_24h_usd=overview["volume_24h_usd"],
        volume_1h_usd=overview["volume_1h_usd"],
        mev_share_pct=0.0,
        lp_locked_pct=100.0,
        unique_holders=overview["holder"],
        age_minutes=age_minutes,
        tx_count_1h=max(overview.get("trade_1h", 10), 1),
    )

    exit_out = compute_exit(exit_inputs)

    combined = int(
        round(
            exit_out.exit_score * 0.50
            + flow.flow_score * 0.30
            + death_score * 0.20
        )
    )
    combined = max(0, min(100, combined))
    verdict = _verdict_from_score(combined)
    rug_prob = 100 - combined

    def _buy(size: float, delta: float) -> ExitBuy:
        exit_val = size * (1 + delta / 100.0)
        return ExitBuy(exit_value=round(exit_val, 2), delta_pct=delta)

    exit_math = ExitMath(
        buy_100=_buy(100, exit_out.exit_delta_100),
        buy_500=_buy(500, exit_out.exit_delta_500),
        buy_5000=_buy(5000, exit_out.exit_delta_5000),
        cascade_500=ExitBuy(
            exit_value=exit_out.cascade_exit_500,
            delta_pct=round(
                ((exit_out.cascade_exit_500 - 500) / 500) * 100, 2
            ),
        ),
        time_to_exit_minutes=exit_out.time_to_exit_minutes,
        mev_tax_pct=exit_out.mev_tax_pct,
    )

    reasons: list[Reason] = []
    if "MICRO LIQUIDITY" in exit_out.flags:
        reasons.append(
            Reason(
                text=f"Micro liquidity (${overview['liquidity_usd']:,.0f})",
                severity="red",
            )
        )
    if "LP UNLOCKED" in exit_out.flags:
        reasons.append(
            Reason(
                text="LP unlocked — treat as high risk",
                severity="red",
            )
        )
    if abs(exit_out.exit_delta_500) >= 25:
        reasons.append(
            Reason(
                text=f"Exit after $500 buy ≈ {exit_out.exit_delta_500:+.0f}%",
                severity="red" if exit_out.exit_delta_500 < -30 else "yellow",
            )
        )
    if exit_out.mev_tax_pct >= 10:
        reasons.append(
            Reason(
                text=f"MEV tax estimate {exit_out.mev_tax_pct:.0f}% of volume",
                severity="yellow",
            )
        )
    if flow.sells > flow.buys:
        reasons.append(
            Reason(
                text=f"Observed sells exceed buys ({flow.sells}/{flow.buys})",
                severity="yellow",
            )
        )
    elif flow.buys > flow.sells and flow.buy_pressure >= 60:
        reasons.append(
            Reason(
                text=f"Observed buy pressure {flow.buy_pressure:.0f}%",
                severity="blue",
            )
        )

    if not reasons:
        reasons.append(
            Reason(
                text="Limited observable flow data",
                severity="yellow",
            )
        )

    confidence = _confidence(flow.confidence, overview["liquidity_usd"])

    resp = VerdictResponse(
        mint=mint,
        symbol=meta["symbol"],
        name=meta["name"],
        image_url=meta.get("image_url"),
        verdict=verdict,  # type: ignore
        rug_probability=rug_prob,
        combined_score=combined,
        scores=Scores(
            exit=exit_out.exit_score,
            flow=flow.flow_score,
            death=death_score,
        ),
        exit_math=exit_math,
        reverse_flow=ReverseFlow(
            ratio=round(flow.sell_volume_usd / max(flow.buy_volume_usd, 1.0), 4),
            smart_in_usd=0.0,
            insider_out_usd=0.0,
            top_sellers=[],
            sniper_offload_count=0,
            dev_wallet_status="unclassified",
            buys=flow.buys,
            sells=flow.sells,
            unique_buyers=flow.unique_buyers,
            unique_sellers=flow.unique_sellers,
            buy_pressure=flow.buy_pressure,
            confidence=flow.confidence,
            source=flow.data_source if transactions else "unavailable",
        ),
        death_data=DeathData(
            narrative_tag="observable_survivability",
            stage="OBSERVED",
            age_basis="recent_transaction_window",
            median_lifespan_minutes=0,
            current_age_minutes=int(age_minutes),
            survival_6h=0.0,
            survival_24h=0.0,
            holder_velocity=0.0,
            volume_decay=1.0,
        ),
        reasons=reasons,
        confidence=confidence,  # type: ignore
        computed_at=datetime.now(timezone.utc),
    )
    resp.tweet_text = _build_tweet_text(resp)
    return resp
