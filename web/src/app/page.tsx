"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isValidMint } from "@/lib/api";

const CHECKS = [
  { k: "LIQUIDITY", d: "Can the market absorb your exit?" },
  { k: "HOLDERS", d: "Who actually controls the supply?" },
  { k: "FLOW", d: "Who's buying, selling and rotating?" },
  { k: "DEV", d: "What has the deployer done?" },
  { k: "EXIT", d: "What does your position actually cost to close?" },
];

export default function HomePage() {
  const router = useRouter();
  const [ca, setCa] = useState("");
  const [error, setError] = useState("");

  function onCheck(e: FormEvent) {
    e.preventDefault();
    const mint = ca.trim();
    if (!isValidMint(mint)) {
      setError("That doesn't look like a Solana contract address.");
      return;
    }
    setError("");
    router.push(`/token/${mint}`);
  }

  return (
    <main className="min-h-dvh max-w-lg mx-auto flex flex-col px-4">
      <header className="pt-10 pb-8">
        <p className="text-[11px] tracking-[0.2em] uppercase text-secondary mb-3">
          Solana intelligence
        </p>
        <h1 className="text-3xl font-bold tracking-tight">DOUBT</h1>
        <p className="text-base text-secondary mt-2">
          Exit math before the entry.
        </p>
        <p className="text-sm text-secondary/80 mt-1">
          Find what the chart doesn&apos;t show.
        </p>
      </header>

      <section className="mb-10">
        <p className="text-[11px] tracking-[0.14em] uppercase text-secondary mb-2">
          Paste contract
        </p>
        <form onSubmit={onCheck} className="space-y-2">
          <input
            value={ca}
            onChange={(e) => {
              setCa(e.target.value);
              setError("");
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text").trim();
              const match = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
              if (match) {
                e.preventDefault();
                setCa(match[0]);
              }
            }}
            placeholder="Paste Solana contract address…"
            className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-sm font-mono placeholder:text-secondary/40 focus:outline-none focus:ring-1 focus:ring-safe/50"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className="w-full bg-safe hover:bg-safe/90 text-white font-semibold rounded-xl py-3 text-sm tracking-wide"
          >
            CHECK
          </button>
        </form>
        {error && <p className="mt-2 text-xs text-avoid">{error}</p>}
      </section>

      <section className="mb-10">
        <p className="text-[11px] tracking-[0.14em] uppercase text-secondary mb-3">
          Discovery
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/radar"
            className="border border-border rounded-xl p-3 hover:border-secondary/40 transition-colors"
          >
            <p className="text-xs font-semibold">RADAR</p>
            <p className="text-[10px] text-secondary mt-1">All signals</p>
          </Link>
          <Link
            href="/fresh"
            className="border border-border rounded-xl p-3 hover:border-secondary/40 transition-colors"
          >
            <p className="text-xs font-semibold">FRESH</p>
            <p className="text-[10px] text-secondary mt-1">New pairs</p>
          </Link>
          <Link
            href="/fading"
            className="border border-border rounded-xl p-3 hover:border-secondary/40 transition-colors"
          >
            <p className="text-xs font-semibold">FADING</p>
            <p className="text-[10px] text-secondary mt-1">Deteriorating</p>
          </Link>
        </div>
      </section>

      <section className="mb-12">
        <p className="text-[11px] tracking-[0.14em] uppercase text-secondary mb-4">
          What Doubt checks
        </p>
        <ul className="space-y-3">
          {CHECKS.map((c) => (
            <li
              key={c.k}
              className="flex gap-3 border-b border-border pb-3 last:border-0"
            >
              <span className="text-[11px] font-semibold tracking-wide text-safe w-20 shrink-0">
                {c.k}
              </span>
              <span className="text-sm text-secondary">{c.d}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto py-6 border-t border-border text-center space-y-2">
        <p className="text-[11px] tracking-[0.12em] uppercase text-secondary">
          Discovery only
        </p>
        <p className="text-[11px] text-secondary">
          No wallet · No swaps · No execution
        </p>
        <p className="flex justify-center gap-3 text-[11px] text-secondary pt-1">
          <a
            href="https://github.com/spanda6z/doubt/tree/main/docs"
            className="hover:text-primary"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
          <a
            href="https://github.com/spanda6z/doubt/blob/main/docs/legal/disclaimer.md"
            className="hover:text-primary"
            target="_blank"
            rel="noreferrer"
          >
            Disclaimer
          </a>
        </p>
      </footer>
    </main>
  );
}
