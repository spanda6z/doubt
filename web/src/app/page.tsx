"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isValidMint } from "@/lib/api";
import type { RadarItem, RadarTab } from "@/lib/radar";
import { fmtAge, fmtPct, fmtUsd } from "@/lib/format";
import { TerminalNav } from "@/components/TerminalNav";

const TABS: { id: RadarTab; label: string }[] = [
  { id: "radar", label: "Radar" },
  { id: "fresh", label: "Fresh" },
  { id: "fading", label: "Fading" },
];

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<RadarTab>("fresh");
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [ca, setCa] = useState("");
  const [caError, setCaError] = useState("");

  const load = useCallback(async (t: RadarTab, soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/radar?tab=${t}&limit=50`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError("Could not load discovery feed.");
      if (!soft) setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
    const id = setInterval(() => load(tab, true), 40_000);
    return () => clearInterval(id);
  }, [tab, load]);

  function onCheck(e: FormEvent) {
    e.preventDefault();
    const mint = ca.trim();
    if (!isValidMint(mint)) {
      setCaError("Invalid Solana contract address.");
      return;
    }
    setCaError("");
    router.push(`/token/${mint}`);
  }

  return (
    <main className="min-h-dvh max-w-lg mx-auto flex flex-col pb-16">
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight">DOUBT</h1>
              <p className="text-[11px] text-secondary">
                Exit math before the entry
              </p>
            </div>
            <button
              type="button"
              onClick={() => load(tab, true)}
              disabled={refreshing || loading}
              className="text-[11px] text-secondary hover:text-primary disabled:opacity-40"
            >
              {refreshing ? "Updating…" : "Refresh"}
            </button>
          </div>

          <form onSubmit={onCheck} className="flex gap-2">
            <input
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
                }
              }}
              placeholder="Paste CA to open case…"
              className="flex-1 bg-card border border-border rounded-xl px-3 py-2.5 text-sm font-mono placeholder:text-secondary/40 focus:outline-none focus:ring-1 focus:ring-safe/40"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              className="shrink-0 bg-safe hover:bg-safe/90 text-white text-sm font-semibold rounded-xl px-4"
            >
              Check
            </button>
          </form>
          {caError && <p className="text-xs text-avoid">{caError}</p>}
        </div>

        <div className="flex px-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-medium uppercase tracking-wide border-b-2 transition-colors ${
                tab === t.id
                  ? "border-safe text-primary"
                  : "border-transparent text-secondary hover:text-primary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 px-3 py-3 space-y-2 pb-8">
        {tab === "fresh" && !loading && (
          <p className="text-[11px] text-secondary px-1">
            Newest pairs first. Fresh ≠ good — check exit cost.
          </p>
        )}
        {tab === "fading" && !loading && (
          <p className="text-[11px] text-secondary px-1">
            Exit conditions under pressure. Not a losers board.
          </p>
        )}
        {tab === "radar" && !loading && (
          <p className="text-[11px] text-secondary px-1">
            Ranked by exit quality + activity. Discovery only.
          </p>
        )}

        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-xl bg-card border border-border animate-pulse"
            />
          ))}

        {!loading && error && (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-secondary">{error}</p>
            <button
              type="button"
              onClick={() => load(tab)}
              className="text-safe text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <p className="text-center text-sm text-secondary py-16">
            DATA UNAVAILABLE — no tokens in this feed right now.
          </p>
        )}

        {!loading &&
          items.map((item, idx) => (
            <Link
              key={item.mint}
              href={`/token/${item.mint}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border bg-card hover:border-secondary/50 active:scale-[0.99] transition-all"
            >
              <span className="text-[11px] text-secondary tabular w-5 shrink-0 text-right">
                {idx + 1}
              </span>

              {item.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.image_url}
                  alt=""
                  className="w-10 h-10 rounded-full bg-border object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {(item.symbol || "?").slice(0, 2)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[14px] truncate">
                    ${item.symbol}
                  </span>
                  <span className="text-[10px] text-secondary tabular shrink-0">
                    {fmtAge(item.age_minutes)}
                  </span>
                </div>
                <div className="flex gap-3 text-[11px] text-secondary mt-0.5">
                  <span>
                    Liq{" "}
                    <span className="text-primary tabular">
                      {item.liquidity_usd > 0
                        ? fmtUsd(item.liquidity_usd)
                        : "—"}
                    </span>
                  </span>
                  <span>
                    Vol{" "}
                    <span className="text-primary tabular">
                      {item.volume_1h_usd > 0
                        ? fmtUsd(item.volume_1h_usd)
                        : "—"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p
                  className={`text-[13px] font-semibold tabular ${
                    (item.price_change_h1 ?? 0) < 0
                      ? "text-avoid"
                      : (item.price_change_h1 ?? 0) > 0
                        ? "text-safe"
                        : "text-secondary"
                  }`}
                >
                  {fmtPct(item.price_change_h1)}
                </p>
                {item.exit_delta_500 <= -15 ? (
                  <p className="text-[10px] text-caution mt-0.5">Thin exit</p>
                ) : (
                  <p className="text-[10px] text-secondary mt-0.5">Open case</p>
                )}
              </div>
            </Link>
          ))}
      </div>

      <footer className="px-4 py-3 border-t border-border text-center text-[10px] text-secondary">
        Discovery only · No wallet · No swaps · Not financial advice
      </footer>
      <TerminalNav />
    </main>
  );
}
