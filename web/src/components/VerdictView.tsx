"use client";

import Link from "next/link";
import type { VerdictResponse } from "@/lib/types";
import { VerdictBadge } from "./VerdictBadge";
import { ExitMathCard } from "./ExitMathCard";
import { ReasonsList } from "./ReasonsList";

function jupiterUrl(mint: string) {
  return `https://jup.ag/swap/SOL-${mint}`;
}

export function VerdictView({ data }: { data: VerdictResponse }) {
  const jup = jupiterUrl(data.mint);

  async function share() {
    const text =
      data.tweet_text ||
      `${data.verdict} — $${data.symbol}\nRug probability: ${data.rug_probability}%\nchecked on doubt`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `$${data.symbol} verdict`,
          text,
          url: window.location.href,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(
        `${text}\n${window.location.href}`
      );
      alert("Copied to clipboard");
    }
  }

  return (
    <div className="min-h-dvh flex flex-col max-w-lg mx-auto">
      <header className="h-14 flex items-center px-4 border-b border-border shrink-0">
        <Link
          href="/"
          className="text-secondary hover:text-primary text-sm transition-colors"
        >
          ← Back
        </Link>
      </header>

      <main className="flex-1 px-4 py-6 space-y-6 pb-28">
        {data.confidence === "LOW" && (
          <div className="bg-risky/10 border border-risky/30 rounded-xl px-4 py-3 text-sm text-risky">
            Low data — treat as risky regardless of score
          </div>
        )}

        <VerdictBadge verdict={data.verdict} />

        <div className="text-center space-y-1 animate-fade-in">
          <h1 className="text-ticker">${data.symbol}</h1>
          <p className="text-secondary text-sm">{data.name}</p>
          <p className="text-xl font-medium mt-2 tabular">
            {data.rug_probability}%{" "}
            <span className="text-secondary text-base font-normal">
              rug probability
            </span>
          </p>
          <p className="text-xs text-secondary">
            Score {data.combined_score} · exit {data.scores.exit} · flow{" "}
            {data.scores.flow} · death {data.scores.death} ·{" "}
            {data.confidence} confidence
          </p>
        </div>

        <ExitMathCard exit={data.exit_math} />

        {data.reasons.length > 0 && <ReasonsList reasons={data.reasons} />}

        <section className="bg-card border border-border rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-secondary mb-3">
            Score breakdown
          </h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-semibold tabular">
                {data.scores.exit}
              </div>
              <div className="text-xs text-secondary mt-0.5">Exit</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular">
                {data.scores.flow}
              </div>
              <div className="text-xs text-secondary mt-0.5">Flow</div>
            </div>
            <div>
              <div className="text-2xl font-semibold tabular">
                {data.scores.death}
              </div>
              <div className="text-xs text-secondary mt-0.5">Death</div>
            </div>
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
          <button
            type="button"
            onClick={share}
            className="block w-full text-center border border-border hover:border-secondary/40 text-primary text-sm font-medium rounded-xl py-3 transition-colors"
          >
            Share this verdict
          </button>
        </div>
      </footer>
    </div>
  );
}
