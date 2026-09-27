"""
Doubt exit-math engine.

Constant-product style impact model for a hypothetical round-trip.
NO DATA → None / UNAVAILABLE. Never invent liquidity or prices.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ExitMathInput:
    liquidity_usd: Optional[float]
    position_usd: float
    fee_bps: float = 25.0
    mev_share_pct: float = 0.0


@dataclass(frozen=True)
class ExitMathResult:
    position_usd: float
    entry_value: float
    price_impact_entry: Optional[float]
    price_impact_exit: Optional[float]
    pool_fee: float
    other_cost: float
    estimated_exit: Optional[float]
    round_trip_cost_pct: Optional[float]
    break_even_move_pct: Optional[float]
    impact_label: str
    available: bool
    reason: Optional[str] = None


def _impact_pct(size: float, liquidity: float) -> float:
    if liquidity <= 0:
        return 100.0
    return (size / (liquidity + size)) * 100.0


def impact_label(delta_pct: float) -> str:
    d = abs(delta_pct)
    if d < 2:
        return "Low"
    if d < 5:
        return "Moderate"
    if d < 12:
        return "Elevated"
    if d < 25:
        return "Severe"
    return "Extreme"


def compute_exit(inp: ExitMathInput) -> ExitMathResult:
    pos = float(inp.position_usd)
    if pos <= 0:
        return ExitMathResult(
            position_usd=pos,
            entry_value=0.0,
            price_impact_entry=None,
            price_impact_exit=None,
            pool_fee=0.0,
            other_cost=0.0,
            estimated_exit=None,
            round_trip_cost_pct=None,
            break_even_move_pct=None,
            impact_label="Unavailable",
            available=False,
            reason="Position size must be positive",
        )

    liq = inp.liquidity_usd
    if liq is None or liq <= 0:
        return ExitMathResult(
            position_usd=pos,
            entry_value=pos,
            price_impact_entry=None,
            price_impact_exit=None,
            pool_fee=0.0,
            other_cost=0.0,
            estimated_exit=None,
            round_trip_cost_pct=None,
            break_even_move_pct=None,
            impact_label="Unavailable",
            available=False,
            reason="Insufficient liquidity or market data",
        )

    effective = liq * max(0.0, 1.0 - (inp.mev_share_pct / 100.0))
    if effective <= 0:
        effective = liq

    entry_impact = _impact_pct(pos, effective)
    tokens = pos * (1.0 - entry_impact / 100.0)
    exit_impact = _impact_pct(tokens, effective)
    gross_exit = tokens * (1.0 - exit_impact / 100.0)

    fee = pos * (inp.fee_bps / 10_000.0) * 2
    other = pos * (inp.mev_share_pct / 100.0) * 0.15
    net_exit = max(0.0, gross_exit - fee - other)

    round_trip = ((pos - net_exit) / pos) * 100.0 if pos else None
    break_even = None
    if round_trip is not None and round_trip < 100:
        break_even = (100.0 / (100.0 - round_trip) - 1.0) * 100.0

    return ExitMathResult(
        position_usd=pos,
        entry_value=pos,
        price_impact_entry=round(entry_impact, 4),
        price_impact_exit=round(exit_impact, 4),
        pool_fee=round(fee, 4),
        other_cost=round(other, 4),
        estimated_exit=round(net_exit, 4),
        round_trip_cost_pct=round(round_trip, 4) if round_trip is not None else None,
        break_even_move_pct=round(break_even, 4) if break_even is not None else None,
        impact_label=impact_label(round_trip or 100),
        available=True,
        reason=None,
    )


def ladder(
    liquidity_usd: Optional[float],
    sizes: list[float] | None = None,
) -> list[ExitMathResult]:
    sizes = sizes or [25, 50, 100, 250, 500, 1000]
    return [compute_exit(ExitMathInput(liquidity_usd=liquidity_usd, position_usd=s)) for s in sizes]
