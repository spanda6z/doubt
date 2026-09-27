import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from exit_math import ExitMathInput, compute_exit, ladder


def test_no_liquidity_is_unavailable():
    r = compute_exit(ExitMathInput(liquidity_usd=None, position_usd=100))
    assert r.available is False
    assert r.estimated_exit is None
    assert "Insufficient" in (r.reason or "")


def test_zero_liquidity_unavailable():
    r = compute_exit(ExitMathInput(liquidity_usd=0, position_usd=100))
    assert r.available is False


def test_deep_book_low_impact():
    r = compute_exit(ExitMathInput(liquidity_usd=5_000_000, position_usd=100))
    assert r.available is True
    assert r.estimated_exit is not None
    assert r.estimated_exit > 90
    assert r.impact_label in ("Low", "Moderate")


def test_thin_book_severe():
    r = compute_exit(ExitMathInput(liquidity_usd=2_000, position_usd=500))
    assert r.available is True
    assert r.round_trip_cost_pct is not None
    assert r.round_trip_cost_pct > 10


def test_ladder_length():
    results = ladder(50_000)
    assert len(results) == 6
    assert all(r.available for r in results)


def test_invalid_position():
    r = compute_exit(ExitMathInput(liquidity_usd=10_000, position_usd=0))
    assert r.available is False
