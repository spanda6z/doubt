# Doubt

**The exit math before the entry.**

Doubt is a Solana meme-token **discovery** platform. We help traders answer one question before they buy:

> *What will this cost me if I'm wrong?*

We do not execute trades. We do not connect wallets. We do not take custody. We sell **honest exit math**, reverse-flow context, and narrative risk — not speed and hype.

---

## Product

| Surface | Purpose |
|--------|---------|
| **Radar** | Live discovery feed ranked by exit quality |
| **Fresh** | Newest pairs first |
| **Fading** | Tokens with bad exit math or sharp dumps |
| **Verdict** | Full exit-math breakdown for any mint (`/t/[CA]`) |

**Category:** Information utility  
**Network:** Solana  
**Legal posture:** Not financial advice · Not a broker · Not a trading interface

### Design principles

1. Every screen answers: *What will this cost me if I'm wrong?*
2. If a screen only shows upside, delete it.
3. No green “gem” language. Neutral risk colors only.
4. Discovery only — never execution.

---

## Quick start (local)

### Web (primary product)

```bash
cd web
npm install
npm run dev
# → http://localhost:3000
```

Optional env (live metadata instead of stubs):

```bash
# web/.env.local
HELIUS_API_KEY=
BIRDEYE_API_KEY=
```

### API (Python / optional)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Deploy (Vercel)

1. Import `spanda6z/doubt` on Vercel  
2. **Root Directory:** `web`  
3. Framework: Next.js  
4. Deploy  

See [docs/ops/deployment.md](docs/ops/deployment.md).

---

## Documentation

| Doc | Description |
|-----|-------------|
| [Product overview](docs/product/overview.md) | What we build and why |
| [User guide](docs/product/user-guide.md) | How to use Radar and Verdicts |
| [Scoring model](docs/product/scoring.md) | Exit, flow, death scores |
| [API reference](docs/api/reference.md) | REST endpoints |
| [Architecture](docs/ops/architecture.md) | System design |
| [Deployment](docs/ops/deployment.md) | Vercel & ops |
| [Security](docs/security/security.md) | Threat model & data handling |
| [Privacy](docs/legal/privacy.md) | Privacy policy |
| [Terms](docs/legal/terms.md) | Terms of use |
| [Disclaimer](docs/legal/disclaimer.md) | Not financial advice |

---

## Repository layout

```
doubt/
├── web/                 # Next.js app (discovery UI + serverless API)
│   ├── src/app/         # App Router pages & API routes
│   ├── src/components/  # UI
│   └── src/lib/         # Exit engine, radar, types
├── app/                 # FastAPI backend (optional / scale path)
├── bot/                 # Telegram bot (optional)
├── docs/                # Official documentation
└── tests/               # Scoring tests
```

---

## Status

**Public alpha.** Radar and exit-math verdicts are live. Flow scoring, death curves, entity pages, and Telegram are roadmap items — see [docs/product/roadmap.md](docs/product/roadmap.md).

---

## Contact

- Product questions: open a GitHub Discussion or Issue  
- Security: see [docs/security/security.md](docs/security/security.md)

---

*Doubt — exit math before the entry.*
