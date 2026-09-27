"""Unit tests for exit engine — no network required."""

from app.scoring.exit_engine import ExitInputs, compute_exit


def test_micro_liquidity_caps_score():
    out = compute_exit(
        ExitInputs(
            total_liquidity_usd=2000,
            top10_holder_pct=40,
            dev_holder_pct=10,
            volume_24h_usd=5000,
            volume_1h_usd=500,
            mev_share_pct=5,
            lp_locked_pct=100,
            unique_holders=200,
            age_minutes=120,
            tx_count_1h=20,
        )
    )
    assert out.exit_score <= 30
    assert "MICRO LIQUIDITY" in out.flags


def test_lp_unlocked_caps_score():
    out = compute_exit(
        ExitInputs(
            total_liquidity_usd=50_000,
            top10_holder_pct=20,
            dev_holder_pct=2,
            volume_24h_usd=100_000,
            volume_1h_usd=10_000,
            mev_share_pct=5,
            lp_locked_pct=0,
            unique_holders=2000,
            age_minutes=300,
            tx_count_1h=50,
        )
    )
    assert out.exit_score <= 20
    assert "LP UNLOCKED" in out.flags


def test_healthy_pool_higher_score():
    out = compute_exit(
        ExitInputs(
            total_liquidity_usd=200_000,
            top10_holder_pct=15,
            dev_holder_pct=0,
            volume_24h_usd=500_000,
            volume_1h_usd=40_000,
            mev_share_pct=3,
            lp_locked_pct=100,
            unique_holders=8000,
            age_minutes=1440,
            tx_count_1h=200,
        )
    )
    assert out.exit_score >= 50
    assert abs(out.exit_delta_500) < 15


if __name__ == "__main__":
    test_micro_liquidity_caps_score()
    test_lp_unlocked_caps_score()
    test_healthy_pool_higher_score()
    print("all exit engine tests passed")
