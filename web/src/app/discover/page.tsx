"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";
import type { RadarItem, RadarTab } from "@/lib/radar";
import { fmtAge, fmtPct, fmtUsd } from "@/lib/format";

const tabs: { id: RadarTab; label: string }[] = [
  { id: "radar", label: "Radar" },
  { id: "fresh", label: "New" },
  { id: "fading", label: "Fading" },
];

export default function DiscoverPage() {
  const [tab, setTab] = useState<RadarTab>("radar");
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/v1/radar?tab=" + tab + "&limit=50", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setItems(d.items || []); })
      .catch(() => { if (!cancelled) setItems([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => i.symbol.toLowerCase().includes(q) || i.mint.toLowerCase().includes(q)) : items;
  }, [items, query]);

  return (
    <main className="min-h-dvh max-w-lg mx-auto pb-24">
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border">
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div><p className="text-[10px] uppercase tracking-[0.2em] text-secondary">Solana terminal</p><h1 className="text-xl font-bold tracking-tight">Discover</h1></div>
            <Link href="/" className="text-xs text-secondary">Check CA →</Link>
          </div>
          <div className="mt-3 rounded-xl bg-card border border-border">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol or CA…" className="w-full bg-transparent px-3 py-2.5 text-sm focus:outline-none" />
          </div>
        </div>
        <div className="flex px-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={"flex-1 py-2.5 text-[11px] uppercase tracking-wide border-b-2 " + (tab === t.id ? "border-safe text-primary" : "border-transparent text-secondary")}>{t.label}</button>
          ))}
        </div>
      </header>

      <section className="px-3 py-3">
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[["Pairs", String(filtered.length)], ["Flow", "Live"], ["Liquidity", "Depth"], ["Mode", tab === "fading" ? "Exit" : "Discovery"]].map(([a,b]) => (
            <div key={a} className="rounded-xl border border-border bg-card px-2.5 py-2"><p className="text-[9px] uppercase tracking-wide text-secondary">{a}</p><p className="mt-1 text-xs font-semibold tabular">{b}</p></div>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[1fr_64px_64px_64px] gap-2 px-3 py-2 border-b border-border text-[9px] uppercase tracking-wide text-secondary"><span>Market</span><span className="text-right">Score</span><span className="text-right">Liq</span><span className="text-right">1h</span></div>
          {loading ? Array.from({length:8}).map((_,i) => <div key={i} className="h-14 border-b border-border animate-pulse" />) :
            filtered.map((item) => (
              <Link key={item.mint} href={"/token/" + item.mint} className="grid grid-cols-[1fr_64px_64px_64px] gap-2 items-center px-3 py-3 border-b border-border last:border-0 hover:bg-white/[0.02]">
                <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-semibold truncate">{"$"}{item.symbol}</span><span className="text-[9px] text-secondary">{fmtAge(item.age_minutes)}</span></div><div className="text-[10px] text-secondary mt-0.5">{item.verdict} · exit {item.exit_delta_500.toFixed(1)}%</div></div>
                <span className="text-right text-[11px] tabular">{item.combined_score}</span>
                <span className="text-right text-[11px] tabular">{fmtUsd(item.liquidity_usd)}</span>
                <span className={"text-right text-[11px] tabular " + (item.price_change_h1 != null && item.price_change_h1 < 0 ? "text-avoid" : "text-safe")}>{fmtPct(item.price_change_h1)}</span>
              </Link>
            ))}
        </div>
        <p className="mt-3 text-[10px] text-secondary">Discovery data is informational. Freshness and liquidity can change quickly.</p>
      </section>
      <TerminalNav />
    </main>
  );
}
