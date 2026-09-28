"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";
import { shortCa } from "@/lib/format";

type WatchItem = { address: string; symbol: string; image_url?: string | null; saved_at: string; alerts: boolean };
type TokenState = { address: string; symbol?: string | null; market?: { liquidity_usd: number | null; volume_1h_usd: number | null } | null; flow?: { observed?: { buy_pressure?: number | null } | null } | null; risk?: { severity?: string } | null; alerts?: { count?: number; alerts?: { title: string; detail: string }[] } | null };
const KEY = "doubt:watchlist:v1";

export default function WatchPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [states, setStates] = useState<Record<string, TokenState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
    const load = async () => {
      setLoading(true);
      const results = await Promise.all(items.map(async (item) => {
        try { const r = await fetch("/api/token/" + item.address, { cache: "no-store" }); return r.ok ? await r.json() as TokenState : null; } catch { return null; }
      }));
      const next: Record<string, TokenState> = {};
      results.forEach((state) => { if (state) next[state.address] = state; });
      setStates(next); setLoading(false);
    };
    if (items.length) load(); else setLoading(false);
  }, [items]);

  const alertCount = useMemo(() => items.filter((item) => {
    const state = states[item.address];
    return item.alerts && (state?.alerts?.count || 0) > 0;
  }).length, [items, states]);

  function remove(address: string) { setItems((current) => current.filter((x) => x.address !== address)); }

  return (
    <main className="min-h-dvh max-w-lg mx-auto px-3 pb-24">
      <header className="pt-5 pb-4 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-secondary">Research</p><h1 className="text-xl font-bold">Watch</h1></div><Link href="/alerts" className="text-[10px] text-secondary hover:text-primary">Alerts →</Link></header>
      <section className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">Saved</p><p className="text-lg font-semibold">{items.length}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">Active alerts</p><p className="text-lg font-semibold">{alertCount}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">Storage</p><p className="text-lg font-semibold">Local</p></div>
      </section>
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-3 border-b border-border"><p className="text-sm font-semibold">Watchlist</p><p className="text-[10px] text-secondary mt-0.5">Saved cases persist in this browser. No account or wallet required.</p></div>
        {items.length === 0 ? <div className="px-4 py-10 text-center"><p className="text-sm font-medium">Nothing saved yet.</p><p className="text-[11px] text-secondary mt-1">Open a token case and tap Watch to keep it here.</p><Link href="/discover" className="inline-block mt-4 text-xs text-safe">Open Discover →</Link></div> : items.map((item) => {
          const s = states[item.address]; const severity = s?.risk?.severity || "—"; const alert = item.alerts && (s?.alerts?.count || 0) > 0;
          return <div key={item.address} className="px-3 py-3 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              {item.image_url ? <img src={item.image_url} alt="" className="w-8 h-8 rounded-full object-cover bg-border" /> : <div className="w-8 h-8 rounded-full bg-border" />}
              <div className="min-w-0 flex-1"><Link href={"/token/" + item.address} className="text-sm font-semibold hover:underline">{"$" + (item.symbol || "TOKEN")}</Link><p className="text-[10px] font-mono text-secondary">{shortCa(item.address)} · {loading && !s ? "updating…" : severity}</p></div>
              {alert ? <span className="text-[9px] uppercase tracking-wide text-risky">Alert</span> : null}<button onClick={() => remove(item.address)} className="text-[10px] text-secondary hover:text-primary">Remove</button>
            </div>
            {s ? <div className="grid grid-cols-3 gap-2 mt-3 text-[10px]"><div><span className="text-secondary">Liquidity</span><p className="font-medium">{s.market?.liquidity_usd != null ? "$" + Math.round(s.market.liquidity_usd).toLocaleString() : "—"}</p></div><div><span className="text-secondary">1h volume</span><p className="font-medium">{s.market?.volume_1h_usd != null ? "$" + Math.round(s.market.volume_1h_usd).toLocaleString() : "—"}</p></div><div><span className="text-secondary">Buy pressure</span><p className="font-medium">{s.flow?.observed?.buy_pressure != null ? s.flow.observed.buy_pressure.toFixed(1) + "%" : "—"}</p></div></div> : null}
          </div>;
        })}
      </section>
      <TerminalNav />
    </main>
  );
}
