"""
Exit Engine (weight 40% in final score).

Purpose: Answer "what do I actually get if I leave?"
Week 1: implement this fully. Flow + Death are stubs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ExitInputs:
    total_liquidity_usd: float
    top10_holder_pct: float
    dev_holder_pct: float
    volume_24h_usd: float
    volume_1h_usd: float
    mev_share_pct: float
    lp_locked_pct: float
    unique_holders: int
    age_minutes: float
    tx_count_1h: int = 10  # fallback if unknown


@dataclass
class ExitOutputs:
    exit_delta_100: float
    exit_delta_500: float
    exit_delta_5000: float
    cascade_exit_500: float
    time_to_exit_minutes: int
    mev_tax_pct: float
    exit_score: int
    flags: list[str]


def _slippage_pct(size: float, liquidity: float) -> float:
    """Constant-product approximation: S / (L + S) * 100."""
    if liquidity <= 0:
        return 100.0
    return (size / (liquidity + size)) * 100.0


def _effective_liquidity(
    total_liquidity_usd: float,
    mev_share_pct: float,
    lp_locked_pct: float,
) -> float:
    lp_unlocked_penalty = 0.5 if lp_locked_pct < 80 else 0.0
    return (
        total_liquidity_usd
        * (1 - mev_share_pct / 100.0)
        * (1 - lp_unlocked_penalty)
    )


def compute_exit(inputs: ExitInputs) -> ExitOutputs:
    flags: list[str] = []

    L = _effective_liquidity(
        inputs.total_liquidity_usd,
        inputs.mev_share_pct,
        inputs.lp_locked_pct,
    )

    # Conservative multiplier for very new pools
    slip_mult = 2.0 if inputs.age_minutes < 60 else 1.0

    def exit_for_buy(size: float) -> tuple[float, float]:
        """Returns (exit_value, delta_pct)."""
        entry_impact = _slippage_pct(size, L) * slip_mult
        tokens_received = size / (1 + entry_impact / 100.0)
        exit_impact = _slippage_pct(tokens_received, L) * slip_mult
        exit_value = tokens_received * (1 - exit_impact / 100.0)
        delta_pct = ((exit_value - size) / size) * 100.0 if size > 0 else 0.0
        return exit_value, delta_pct

    exit_100, delta_100 = exit_for_buy(100)
    exit_500, delta_500 = exit_for_buy(500)
    exit_5000, delta_5000 = exit_for_buy(5000)

    # Cascade: top-10 sell into the pool
    cascade_size = (inputs.top10_holder_pct / 100.0) * inputs.total_liquidity_usd
    cascade_impact = (
        cascade_size / (inputs.total_liquidity_usd + cascade_size)
        if inputs.total_liquidity_usd > 0
        else 1.0
    )
    cascade_exit = 500 * (1 - cascade_impact)

    # Time-to-exit-liquidity (minutes)
    avg_tx_size_1h = (
        inputs.volume_1h_usd / max(inputs.tx_count_1h, 1)
        if inputs.tx_count_1h > 0
        else 100.0
    )
    depth_at_1pct = inputs.total_liquidity_usd * 0.01
    if depth_at_1pct <= 0 or avg_tx_size_1h <= 0:
        minutes_to_absorb = 999
    else:
        minutes_to_absorb = (500 / depth_at_1pct) * (1 / max(avg_tx_size_1h, 1)) * 60
        minutes_to_absorb = min(999, max(0, round(minutes_to_absorb)))

    # Score
    score = 100
    score -= min(40, abs(delta_500))
    score -= min(20, abs(delta_5000))
    score -= min(20, minutes_to_absorb / 5)
    score -= min(20, inputs.mev_share_pct)
    score = max(0, min(100, int(round(score))))

    # Edge cases
    if inputs.total_liquidity_usd < 5000:
        flags.append("MICRO LIQUIDITY")
        score = min(score, 30)
    if inputs.lp_locked_pct < 80:
        flags.append("LP UNLOCKED")
        score = min(score, 20)
    if inputs.age_minutes < 60:
        flags.append("NEW POOL")

    return ExitOutputs(
        exit_delta_100=round(delta_100, 2),
        exit_delta_500=round(delta_500, 2),
        exit_delta_5000=round(delta_5000, 2),
        cascade_exit_500=round(cascade_exit, 2),
        time_to_exit_minutes=int(minutes_to_absorb),
        mev_tax_pct=round(inputs.mev_share_pct, 2),
        exit_score=score,
        flags=flags,
    )
