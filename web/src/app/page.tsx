"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { isValidMint } from "@/lib/api";

const RECENT_KEY = "doubt_recent_mints";

type Recent = { mint: string; symbol?: string; at: number };

function loadRecent(): Recent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Recent[]).slice(0, 5);
  } catch {
    return [];
  }
}

function pushRecent(mint: string) {
  const prev = loadRecent().filter((r) => r.mint !== mint);
  const next = [{ mint, at: Date.now() }, ...prev].slice(0, 5);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function HomePage() {
  const router = useRouter();
  const [ca, setCa] = useState("");
  const [error, setError] = useState("");
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  function go(mint: string) {
    pushRecent(mint);
    router.push(`/t/${mint}`);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const mint = ca.trim();
    if (!isValidMint(mint)) {
      setError("That doesn't look like a Solana mint address.");
      return;
    }
    setError("");
    go(mint);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Doubt</h1>
          <p className="text-secondary text-lg leading-snug">
            The exit math before the entry.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="ca"
              className="block text-xs font-semibold uppercase tracking-wider text-secondary mb-2"
            >
              Paste a Solana token CA
            </label>
            <input
              id="ca"
              type="text"
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
                  setError("");
                }
              }}
              placeholder="Paste mint address…"
              className="w-full bg-card border border-border rounded-xl px-4 py-3.5 text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-safe/40 font-mono text-sm"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-avoid">{error}</p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-safe hover:bg-safe/90 active:scale-[0.99] text-white font-semibold rounded-xl py-3.5 transition-all"
          >
            Check exit math
          </button>
        </form>

        {recent.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Recent
            </p>
            <ul className="space-y-1.5">
              {recent.map((r) => (
                <li key={r.mint}>
                  <button
                    type="button"
                    onClick={() => go(r.mint)}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-card border border-border hover:border-secondary/30 transition-colors font-mono text-sm text-secondary hover:text-primary truncate"
                  >
                    {r.mint.slice(0, 6)}…{r.mint.slice(-6)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-xs text-secondary leading-relaxed">
          Discovery only. No wallet. No swaps. No custody.
          <br />
          Not financial advice.
        </p>
      </div>
    </main>
  );
}
