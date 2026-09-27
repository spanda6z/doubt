# API reference

Base URL (production): `https://<your-deployment>/api`

All responses are JSON. Times are ISO-8601 UTC.

**Authentication:** none for public alpha.  
**Rate limits:** subject to change; do not hammer endpoints.

---

## GET `/v1/radar`

Discovery feed.

### Query parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `tab` | string | `radar` | `radar` \| `fresh` \| `fading` |
| `limit` | number | `30` | Max items (1–50) |

### Response

```json
{
  "tab": "radar",
  "count": 24,
  "items": [
    {
      "mint": "…",
      "symbol": "EXAMPLE",
      "name": "Example Token",
      "image_url": "https://…",
      "price_usd": 0.00012,
      "liquidity_usd": 15420.5,
      "volume_1h_usd": 8200,
      "volume_24h_usd": 110000,
      "age_minutes": 185,
      "verdict": "RISKY",
      "combined_score": 42,
      "rug_probability": 58,
      "exit_delta_500": -31.2,
      "cascade_delta_500": -48.0,
      "time_to_exit_minutes": 12,
      "price_change_m5": -2.1,
      "price_change_h1": -18.4
    }
  ],
  "updated_at": "2026-09-27T22:00:00.000Z"
}
```

---

## GET `/v1/verdict/:mint`

Full verdict for a Solana mint address.

### Path

| Param | Description |
|-------|-------------|
| `mint` | Base58 mint, 32–44 characters |

### Errors

| Status | Meaning |
|--------|---------|
| 400 | Invalid mint format |
| 200 | Body always JSON; model may use stubs when upstream keys missing |

### Response (contract summary)

```json
{
  "mint": "…",
  "symbol": "TOKEN",
  "name": "Token Name",
  "image_url": null,
  "verdict": "AVOID",
  "rug_probability": 72,
  "combined_score": 28,
  "scores": { "exit": 22, "flow": 55, "death": 40 },
  "exit_math": {
    "buy_100": { "exit_value": 88.5, "delta_pct": -11.5 },
    "buy_500": { "exit_value": 340.0, "delta_pct": -32.0 },
    "buy_5000": { "exit_value": 2100.0, "delta_pct": -58.0 },
    "cascade_500": { "exit_value": 260.0, "delta_pct": -48.0 },
    "time_to_exit_minutes": 15,
    "mev_tax_pct": 8.0
  },
  "reverse_flow": { },
  "death_data": { },
  "reasons": [
    { "text": "Micro liquidity ($2,100)", "severity": "red" }
  ],
  "confidence": "LOW",
  "computed_at": "2026-09-27T22:00:00.000Z",
  "tweet_text": "…"
}
```

---

## Versioning

Paths are prefixed with `/v1`. Breaking changes will bump the version prefix. Additive fields may appear without a bump.

## Fair use

Scraping at high volume without coordination may be blocked. Prefer caching (responses include `Cache-Control` where applicable).
