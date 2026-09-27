# Security

## Scope

Doubt is a **read-only** information product. There is no wallet connection, no transaction construction for users, and no custody.

## Threat model (summary)

| Threat | Mitigation |
|--------|------------|
| Phishing / fake “Doubt” sites | Official domain only; no seed phrases ever requested |
| API abuse / scraping | Rate limits (planned), caching, fair-use policy |
| Supply-chain | Lockfiles; minimal dependencies; Vercel build isolation |
| Key leakage | Env vars only; no secrets in client bundles for private keys (none exist) |
| Misleading scores | Disclaimers; confidence levels; no guaranteed fills |

## What we never ask for

- Seed phrases  
- Private keys  
- Wallet signatures for trading  
- Deposit addresses  

If any UI requests these, **it is not official**.

## Data handling

- No user accounts in alpha  
- Mint addresses queried are operational data, not passwords  
- Prefer not to log full IP + mint pairs longer than needed for abuse control  

See [Privacy](../legal/privacy.md).

## Reporting

If you discover a vulnerability in the official repository or deployment:

1. Do not open a public issue with exploit detail  
2. Contact the maintainers privately via GitHub security advisories when enabled  

## Dependencies

Keep `npm audit` / Dependabot alerts under review for the `web/` package.
