from app.scoring.flow_engine import compute_flow


MINT = "TokenMint"


def test_flow_counts_observed_buy_and_sell_swaps():
    txs = [
        {
            "type": "SWAP",
            "description": "Swapped 1 SOL for 1000 TOKEN",
            "tokenTransfers": [{"mint": MINT, "tokenAmount": 1000, "toUserAccount": "buyer"}],
        },
        {
            "type": "SWAP",
            "description": "Swapped 500 TOKEN for 0.5 SOL",
            "tokenTransfers": [{"mint": MINT, "tokenAmount": 500, "fromUserAccount": "seller"}],
        },
    ]
    out = compute_flow(txs, MINT, 0.01)
    assert out.buys == 1
    assert out.sells == 1
    assert out.unique_buyers == 1
    assert out.unique_sellers == 1
    assert out.buy_volume_usd == 10
    assert out.sell_volume_usd == 5
    assert out.net_flow_usd == 5
    assert out.buy_pressure == 66.67


def test_flow_is_low_confidence_without_activity():
    out = compute_flow([], MINT, 1)
    assert out.buys == 0
    assert out.sells == 0
    assert out.buy_pressure == 50
    assert out.confidence == "LOW"
