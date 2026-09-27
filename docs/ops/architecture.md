# Architecture

## Overview

```
┌─────────────────────┐
│   Browser (Next.js) │
│  Radar · Verdict UI │
└──────────┬──────────┘
           │ same-origin
┌──────────▼──────────┐
│  Next.js Route Handlers
│  /api/v1/radar
│  /api/v1/verdict/:mint
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
 DexScreener   Helius / Birdeye
 (universe)    (optional meta)
     │
     ▼
 Exit engine (TypeScript)
```

Optional parallel stack:

```
Telegram → Bot → FastAPI → Postgres / Redis → same scoring ideas
```

## Principles

1. **Read-only** — no signing, no swaps  
2. **Fail closed on uncertainty** — low data → riskier posture  
3. **Edge-friendly** — serverless handlers, short cache TTLs  
4. **Monorepo** — `web/` ships the product; `app/` is scale path  

## Data sources

| Source | Use |
|--------|-----|
| DexScreener | Token universe, pairs, liquidity, volume, price changes |
| Helius DAS | Token metadata when `HELIUS_API_KEY` set |
| Birdeye | Overview metrics when `BIRDEYE_API_KEY` set |

Without keys, verdicts still return structured JSON using deterministic liquidity stubs derived from the mint — labeled via confidence and reasons where applicable.

## Caching

- Radar: ~40–45s revalidate  
- Verdict: ~30s revalidate  

## Trust boundaries

- Clients are untrusted  
- Upstream market data is untrusted  
- Scores are informational only  

See [security](../security/security.md).
