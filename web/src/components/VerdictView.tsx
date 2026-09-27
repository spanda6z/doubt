"use client";

import Link from "next/link";
import { useState } from "react";
import type { VerdictResponse } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { ExitMathCard } from "./ExitMathCard";
import { ReasonsList } from "./ReasonsList";

function jupiterUrl(mint: string) {
  return `https://jup.ag/swap/SOL-${mint}`;
}

function shortMint(mint: string) {
  if (mint.length <= 12) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function VerdictView({ data }: { data: VerdictResponse }) {
  const jup = jupiterUrl(data.mint);
  const [copied, setCopied] = useState(false);

  async function copyCa() {
    try {
      await navigator.clipboard.writeText(data.mint);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  async function share() {
    const text =
      data.tweet_text ||
      `${data.verdict} — $${data.symbol}\nRug probability: ${data.rug_probability}%\nBuy $500 → exit $${data.exit_math.buy_500.exit_value.toFixed(0)} (${data.exit_math.buy_500.delta_pct >= 0 ? "+" : ""}${data.exit_math.buy_500.delta_pct.toFixed(0)}%)`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({
          title: `$${data.symbol} verdict`,
          text,
          url,
        });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <Link
          href="/"
          className="text-secondary hover:text-primary text-sm transition-colors"
        >
          ← Back
        </Link>
        <button
          type="button"
          onClick={copyCa}
          className="text-xs font-mono text-secondary hover:text-primary transition-colors tabular"
          title="Copy mint address"
        >
          {copied ? "Copied" : shortMint(data.mint)}
        </button>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 pb-32">
        {data.confidence === "LOW" && (
          <div className="bg-risky/10 border border-risky/30 rounded-xl px-4 py-3 text-sm text-risky">
            Low data — treat as risky regardless of score
          </div>
        )}

        <VerdictBadge verdict={data.verdict} />

        <div className="text-center space-y-1 animate-fade-in">
          <h1 className="text-ticker tracking-tight">${data.symbol}</h1>
          <p className="text-secondary text-sm truncate px-4">{data.name}</p>
          <p className="text-xl font-medium mt-3 tabular">
            {data.rug_probability}%{" "}
            <span className="text-secondary text-base font-normal">
              rug probability
            </span>
          </p>
          <p className="text-xs text-secondary mt-1">
            Score {data.combined_score}
            <span className="mx-1.5 opacity-40">·</span>
            exit {data.scores.exit}
            <span className="mx-1.5 opacity-40">·</span>
            flow {data.scores.flow}
            <span className="mx-1.5 opacity-40">·</span>
            death {data.scores.death}
            <span className="mx-1.5 opacity-40">·</span>
            {data.confidence.toLowerCase()} confidence
          </p>
        </div>

        <ExitMathCard exit={data.exit_math} />

        {data.reasons.length > 0 && <ReasonsList reasons={data.reasons} />}

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-4">
            Score breakdown
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            {(
              [
                ["Exit", data.scores.exit, "40%"],
                ["Flow", data.scores.flow, "35%"],
                ["Death", data.scores.death, "25%"],
              ] as const
            ).map(([label, value, weight]) => (
              <div key={label}>
                <div className="text-2xl font-semibold tabular">{value}</div>
                <div className="text-xs text-secondary mt-0.5">{label}</div>
                <div className="text-[10px] text-secondary/60 mt-0.5">
                  {weight}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur border-t border-border">
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
          <a
            href={jup}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center bg-buy-btn hover:bg-buy-btn/80 text-secondary text-sm font-medium rounded-xl py-3 transition-colors"
          >
            I understand, trade anyway ↗
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={copyCa}
              className="text-center border border-border hover:border-secondary/40 text-primary text-sm font-medium rounded-xl py-2.5 transition-colors"
            >
              {copied ? "Copied ✓" : "Copy CA"}
            </button>
            <button
              type="button"
              onClick={share}
              className="text-center border border-border hover:border-secondary/40 text-primary text-sm font-medium rounded-xl py-2.5 transition-colors"
            >
              Share
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
