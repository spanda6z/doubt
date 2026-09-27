"""
Telegram bot — optional Week 1 companion.

Any message containing a base58 CA (32-44 chars) → auto-check.
Commands: /start, /check <CA>
Rate limit: 10/min per chat.
"""

from __future__ import annotations

import logging
import os
import re
import time
from collections import defaultdict, deque
from typing import DefaultDict, Deque

import httpx
from telegram import Update
from telegram.constants import ParseMode
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

MINT_RE = re.compile(r"[1-9A-HJ-NP-Za-km-z]{32,44}")

_rate: DefaultDict[int, Deque[float]] = defaultdict(lambda: deque(maxlen=20))
RATE_LIMIT = int(os.getenv("BOT_RATE_LIMIT_PER_CHAT_PER_MIN", "10"))
API_BASE = os.getenv("DOUBT_API_BASE", "http://127.0.0.1:8000")


def _allowed(chat_id: int) -> bool:
    now = time.time()
    window = _rate[chat_id]
    while window and now - window[0] > 60:
        window.popleft()
    if len(window) >= RATE_LIMIT:
        return False
    window.append(now)
    return True


def _extract_mint(text: str) -> str | None:
    m = MINT_RE.search(text or "")
    return m.group(0) if m else None


def _format_verdict(data: dict) -> str:
    v = data.get("verdict", "?")
    symbol = data.get("symbol", "?")
    rug = data.get("rug_probability", "?")
    exit_math = data.get("exit_math") or {}
    buy500 = exit_math.get("buy_500") or {}
    exit_val = buy500.get("exit_value", "?")
    delta = buy500.get("delta_pct", 0)
    cascade = exit_math.get("cascade_500") or {}
    cascade_val = cascade.get("exit_value", "?")
    time_exit = exit_math.get("time_to_exit_minutes", "?")
    reasons = data.get("reasons") or []
    confidence = data.get("confidence", "LOW")
    scores = data.get("scores") or {}

    emoji = {
        "SAFE": "🔵",
        "CAUTION": "⚠️",
        "RISKY": "🟠",
        "AVOID": "🔴",
    }.get(v, "⚠️")

    lines = [
        f"{emoji} *{v}* — `${symbol}`",
        f"Rug probability: *{rug}%*",
        f"Combined score: {data.get('combined_score', '?')} "
        f"(exit {scores.get('exit', '?')} / flow {scores.get('flow', '?')} / death {scores.get('death', '?')})",
        "",
        "*IF YOU BUY $500 NOW*",
        f"You actually exit at  `${exit_val}`  ({delta:+.0f}%)",
        f"If top-10 holders sell  `${cascade_val}`",
        f"Exit liquidity lasts  ~{time_exit} min",
        "",
    ]

    if reasons:
        lines.append("*Why:*")
        for r in reasons[:4]:
            sev = r.get("severity", "yellow")
            mark = "🔴" if sev == "red" else "🟡"
            lines.append(f"{mark} {r.get('text', '')}")

    lines.extend(
        [
            "",
            f"Confidence: {confidence}",
            "_Not financial advice. Exit math only._",
        ]
    )
    return "\n".join(lines)


async def _fetch_verdict(mint: str) -> dict:
    url = f"{API_BASE}/v1/verdict/{mint}"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def start_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    text = (
        "🔍 *Doubt* — the exit math before the entry.\n\n"
        "Paste any Solana token CA and I’ll tell you what a $500 buy "
        "actually exits at, plus the biggest red flags.\n\n"
        "Commands:\n"
        "/check `<CA>` — force a verdict\n"
        "/start — this message\n\n"
        "_Discovery only. No trading. No custody. Not financial advice._"
    )
    await update.message.reply_text(text, parse_mode=ParseMode.MARKDOWN)


async def check_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    chat_id = update.effective_chat.id
    if not _allowed(chat_id):
        await update.message.reply_text("Rate limit: max 10 checks/min. Slow down.")
        return

    if not context.args:
        await update.message.reply_text("Usage: /check <mint_address>")
        return

    mint = context.args[0].strip()
    if not MINT_RE.fullmatch(mint):
        await update.message.reply_text(
            "That doesn’t look like a Solana mint address."
        )
        return

    await update.message.reply_text("Checking…")
    try:
        data = await _fetch_verdict(mint)
        await update.message.reply_text(
            _format_verdict(data), parse_mode=ParseMode.MARKDOWN
        )
    except Exception:
        logger.exception("Verdict fetch failed")
        await update.message.reply_text(
            "Could not fetch verdict. Upstream may be down."
        )


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not update.message or not update.message.text:
        return

    mint = _extract_mint(update.message.text)
    if not mint:
        return

    chat_id = update.effective_chat.id
    if not _allowed(chat_id):
        await update.message.reply_text("Rate limit: max 10 checks/min. Slow down.")
        return

    await update.message.reply_text("Checking…")
    try:
        data = await _fetch_verdict(mint)
        await update.message.reply_text(
            _format_verdict(data), parse_mode=ParseMode.MARKDOWN
        )
    except Exception:
        logger.exception("Verdict fetch failed")
        await update.message.reply_text(
            "Could not fetch verdict. Upstream may be down."
        )


def main() -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit("TELEGRAM_BOT_TOKEN is required")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", start_cmd))
    app.add_handler(CommandHandler("check", check_cmd))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, on_text))

    logger.info("Bot starting (API_BASE=%s)", API_BASE)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
