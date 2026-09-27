# Doubt — The exit math before the entry.

Solana meme token **discovery** platform.  
No wallet. No swaps. No custody. Pure data + analysis.

> Every screen answers: *What will this cost me if I'm wrong?*

---

## Stack

| Layer | Tech |
|-------|------|
| API | FastAPI (Python) — scoring + data |
| Web | Next.js 14 App Router + Tailwind |
| Bot | python-telegram-bot (optional) |
| Cache | Redis (optional) |
| DB | Postgres / Supabase (optional Week 1) |

---

## Quick start

### 1. API

```bash
cd solana-doubt
pip install -r requirements.txt
cp .env.example .env   # optional: add HELIUS_API_KEY, BIRDEYE_API_KEY

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Web UI

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

Paste a CA on the home page → `/t/<mint>` verdict screen.

### 3. Telegram bot (optional)

```bash
export DOUBT_API_BASE=http://127.0.0.1:8000
export TELEGRAM_BOT_TOKEN=...
python -m bot.telegram_bot
```

---

## Screens (web)

- **/** — Paste CA
- **/t/[mint]** — Verdict screen (exit math, reasons, gray trade link)

Matches Section 7 mobile-first design:
- Near-black background, no green on verdict
- Big verdict word + rug probability
- "If you buy $500 now" exit math card
- Expandable reasons with Solscan links
- Gray "I understand, trade anyway" → Jupiter (external)

---

## Project layout

```
solana-doubt/
├── app/                 # FastAPI backend
│   ├── main.py
│   ├── scoring/exit_engine.py
│   ├── data/            # Helius, Birdeye
│   └── services/verdict.py
├── web/                 # Next.js frontend
│   └── src/
│       ├── app/         # pages
│       ├── components/  # VerdictView, ExitMathCard, …
│       └── lib/         # api client, types
├── bot/telegram_bot.py
└── tests/
```

---

## Design rules (non-negotiable)

1. Every number has a delta or a link  
2. Buy button is always last and always gray  
3. No green on the verdict screen  
4. Empty state = "we don't guess"  
5. Discovery only — never execution
