"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isValidMint } from "@/lib/api";
import type { RadarItem, RadarTab } from "@/lib/radar";
import { TokenCard } from "@/components/TokenCard";

const TABS: { id: RadarTab; label: string; icon: string }[] = [
  { id: "radar", label: "Radar", icon: "🌡️" },
  { id: "fresh", label: "Fresh", icon: "⏱️" },
  { id: "fading", label: "Fading", icon: "🔻" },
];

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<RadarTab>("radar");
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ca, setCa] = useState("");
  const [caError, setCaError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const load = useCallback(async (t: RadarTab, soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/radar?tab=${t}&limit=50`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load radar");
      const data = await res.json();
      setItems(data.items || []);
      setUpdatedAt(data.updated_at || null);
    } catch {
      setError("Could not load discovery feed. Try again.");
      if (!soft) setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
    const id = setInterval(() => load(tab, true), 45_000);
    return () => clearInterval(id);
  }, [tab, load]);

  function onCheck(e: FormEvent) {
    e.preventDefault();
    const mint = ca.trim();
    if (!isValidMint(mint)) {
      setCaError("That doesn't look like a Solana mint address.");
      return;
    }
    setCaError("");
    router.push(`/t/${mint}`);
  }

  const avoidCount = items.filter((i) => i.verdict === "AVOID").length;
  const riskyCount = items.filter(
    (i) => i.verdict === "RISKY" || i.verdict === "AVOID"
  ).length;

  return (
    <main className="min-h-dvh max-w-lg mx-auto flex flex-col">
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Doubt</h1>
              <p className="text-xs text-secondary">
                Exit math before the entry
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(tab, true)}
              disabled={refreshing || loading}
              className="text-xs text-secondary hover:text-primary disabled:opacity-40"
            >
              {refreshing ? "Updating…" : "Refresh"}
            </button>
          </div>

          <form onSubmit={onCheck} className="flex gap-2">
            <input
              type="text"
              value={ca}
              onChange={(e) => {
                setCa(e.target.value);
                setCaError("");
              }}
              onPaste={(e) => {
                const text = e.clipboardData.getData("text").trim();
                const match = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
                if (match) {
                  e.preventDefault();
                  setCa(match[0]);
                  setCaError("");
                }
              }}
              placeholder="Paste any CA…"
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-safe/40"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="shrink-0 bg-safe hover:bg-safe/90 text-white text-sm font-semibold rounded-xl px-4 py-2.5"
            >
              Check
            </button>
          </form>
          {caError && (
            <p className="mt-1.5 text-xs text-avoid">{caError}</p>
          )}
        </div>

        <div className="flex px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-safe text-primary"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-3 pb-10">
        {!loading && items.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-secondary px-0.5">
            <span>
              {items.length} tokens
              {tab === "radar" && riskyCount > 0 && (
                <> · {riskyCount} elevated risk</>
              )}
              {tab === "fading" && avoidCount > 0 && (
                <> · {avoidCount} avoid</>
              )}
            </span>
            {updatedAt && (
              <span>
                {new Date(updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        )}

        {tab === "fading" && !loading && (
          <p className="text-xs text-secondary px-0.5">
            Bad exit math or sharp dumps — what it costs if you&apos;re wrong.
          </p>
        )}
        {tab === "fresh" && !loading && (
          <p className="text-xs text-secondary px-0.5">
            Newest pairs first. Thin books = high exit cost.
          </p>
        )}

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-card border border-border animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 space-y-3">
            <p className="text-secondary text-sm">{error}</p>
            <button
              type="button"
              onClick={() => load(tab)}
              className="text-safe text-sm hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <p className="text-secondary text-sm">
              No tokens in this feed right now.
            </p>
            <p className="text-xs text-secondary">
              Paste a CA above — we don&apos;t invent coins.
            </p>
          </div>
        )}

        {!loading &&
          items.map((item) => <TokenCard key={item.mint} item={item} />)}
      </div>

      <footer className="px-4 py-5 border-t border-border text-center text-[11px] text-secondary space-y-2">
        <p>Discovery only · No wallet · No swaps · Not financial advice</p>
        <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <a
            href="https://github.com/spanda6z/doubt/blob/main/docs/legal/disclaimer.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            Disclaimer
          </a>
          <a
            href="https://github.com/spanda6z/doubt/blob/main/docs/legal/terms.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            Terms
          </a>
          <a
            href="https://github.com/spanda6z/doubt/blob/main/docs/legal/privacy.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            Privacy
          </a>
          <a
            href="https://github.com/spanda6z/doubt/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary underline-offset-2 hover:underline"
          >
            Docs
          </a>
        </p>
      </footer>
    </main>
  );
}
