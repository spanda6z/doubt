"""
Verdict service — Week 1: exit engine only.
Flow + death are neutral stubs so the response contract is complete.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from app.config import get_settings
from app.data import get_token_metadata, get_token_overview
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


def _confidence(age_minutes: float, liquidity_usd: float) -> str:
    if age_minutes < 30 or liquidity_usd < 10_000:
        return "LOW"
    if age_minutes < 24 * 60 and liquidity_usd > 10_000:
        return "MEDIUM"
    if age_minutes >= 24 * 60 and liquidity_usd > 50_000:
        return "HIGH"
    return "MEDIUM"


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

    meta = await get_token_metadata(mint)
    overview = await get_token_overview(mint)

    age_minutes = 180.0  # placeholder until on-chain age is wired

    exit_inputs = ExitInputs(
        total_liquidity_usd=overview["liquidity_usd"],
        top10_holder_pct=35.0,
        dev_holder_pct=5.0,
        volume_24h_usd=overview["volume_24h_usd"],
        volume_1h_usd=overview["volume_1h_usd"],
        mev_share_pct=8.0,
        lp_locked_pct=0.0,
        unique_holders=overview["holder"],
        age_minutes=age_minutes,
        tx_count_1h=max(overview.get("trade_1h", 10), 1),
    )

    exit_out = compute_exit(exit_inputs)

    flow_score = 55
    death_score = 55

    combined = int(
        round(
            exit_out.exit_score * 0.40
            + flow_score * 0.35
            + death_score * 0.25
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
    if not reasons:
        reasons.append(
            Reason(
                text="Limited data — exit math only (Week 1)",
                severity="yellow",
            )
        )

    confidence = _confidence(age_minutes, overview["liquidity_usd"])

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
            flow=flow_score,
            death=death_score,
        ),
        exit_math=exit_math,
        reverse_flow=ReverseFlow(
            ratio=1.0,
            smart_in_usd=0,
            insider_out_usd=0,
            top_sellers=[],
            sniper_offload_count=0,
            dev_wallet_status="unknown",
        ),
        death_data=DeathData(
            narrative_tag="other",
            stage="UNKNOWN",
            median_lifespan_minutes=0,
            current_age_minutes=int(age_minutes),
            survival_6h=0.5,
            survival_24h=0.3,
            holder_velocity=0.0,
            volume_decay=1.0,
        ),
        reasons=reasons,
        confidence=confidence,  # type: ignore
        computed_at=datetime.now(timezone.utc),
    )
    resp.tweet_text = _build_tweet_text(resp)
    return resp
