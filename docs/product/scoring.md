# Scoring model

Doubt combines three engines. **Alpha weights (current product):**

| Engine | Weight | Status |
|--------|--------|--------|
| Exit | 40% | Live |
| Flow | 35% | Partial / placeholder |
| Death | 25% | Partial / age heuristic |

```
combined_score = round(exit×0.40 + flow×0.35 + death×0.25)
rug_probability = 100 − combined_score
```

## Verdict thresholds

| Score | Verdict |
|------:|---------|
| ≥ 75 | SAFE |
| ≥ 55 | CAUTION |
| ≥ 35 | RISKY |
| < 35 | AVOID |

## Exit engine

Models constant-product style impact for a notional buy, then a sell back into the same depth.

### Inputs

- Total liquidity (USD)  
- Estimated MEV share of flow  
- LP lock proxy  
- 1h volume & trade intensity  
- Pool age  

### Outputs

- Exit delta for $100 / $500 / $5,000 buys  
- Cascade exit for a stylized large-holder sell  
- Time-to-exit heuristic (minutes)  
- Exit score (0–100)  

### Hard penalties (examples)

- Liquidity under $5,000 → micro-liquidity flag; score capped  
- LP treated as unlocked → severe cap  
- Very new pools → higher impact multiplier  

Formulas are implemented in:

- `web/src/lib/exit-engine.ts` (production path on Vercel)  
- `app/scoring/exit_engine.py` (Python path)  

## Flow engine (roadmap / partial)

Intended signals:

- Smart money vs insider outflow ratio  
- Sniper offload behavior  
- Deployer wallet status  

Current production may use neutral placeholders until ingestion is complete.

## Death engine (roadmap / partial)

Intended signals:

- Narrative cohort median lifespan  
- Holder velocity and volume decay  
- Stage labels (ignition → death)  

Current production uses age-based heuristics only.

## Confidence

| Level | Typical conditions |
|-------|--------------------|
| LOW | Very new pool or thin liquidity |
| MEDIUM | Moderate age and liquidity |
| HIGH | Seasoned pool with deeper book |

Low confidence should **override** optimistic reading of the badge.

## Limitations

- On-chain reality changes faster than any poll interval  
- Liquidity and volume sources can lag or disagree  
- Exit math is a **model**, not a guaranteed fill  
- MEV, routing, and wallet-specific paths are approximated  

We optimize for **honest uncertainty**, not false precision.
