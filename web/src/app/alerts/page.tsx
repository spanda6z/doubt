"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";
import { shortCa } from "@/lib/format";

type WatchItem = { address: string; symbol: string; alerts: boolean };
type Alert = { title: string; detail: string; severity: string; signal?: string; window?: string | null; confidence?: string };
type State = { risk?: { severity?: string; evidence?: { title: string; detail: string; severity: string }[] } | null; alerts?: { available?: boolean; alerts?: Alert[]; count?: number } | null };
const KEY = "doubt:watchlist:v1";

export default function AlertsPage() {
  const [items, setItems] = useState<WatchItem[]>([]);
  const [states, setStates] = useState<Record<string, State>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { try { const raw = localStorage.getItem(KEY); if (raw) setItems(JSON.parse(raw)); } catch {} }, []);
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const enabled = items.filter((x) => x.alerts !== false);
      const results = await Promise.all(enabled.map(async (item) => {
        try { const r = await fetch("/api/token/" + item.address, { cache: "no-store" }); return r.ok ? [item.address, await r.json()] as const : null; } catch { return null; }
      }));
      const next: Record<string, State> = {};
      results.forEach((entry) => { if (entry) next[entry[0]] = entry[1]; });
      setStates(next); setLoading(false);
    };
    if (items.length) load(); else setLoading(false);
  }, [items]);

  const alerts = items.flatMap((item) => {
    const state = states[item.address];
    const severity = state?.risk?.severity || "INSUFFICIENT DATA";
    const observed = state?.alerts?.alerts || [];
    if (!state || observed.length === 0) return [];
    return [{ ...item, severity, evidence: observed.map((a) => ({ title: a.title, detail: a.detail, severity: a.severity })) }];
  });

  return (
    <main className="min-h-dvh max-w-lg mx-auto px-3 pb-24">
      <header className="pt-5 pb-4"><Link href="/watch" className="text-[10px] text-secondary">← Watch</Link><p className="text-[10px] uppercase tracking-[0.2em] text-secondary mt-4">Research</p><h1 className="text-xl font-bold">Alerts</h1><p className="text-[11px] text-secondary mt-1">Evidence-based state changes from your saved cases.</p></header>
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <div className="p-5 text-xs text-secondary">Checking saved cases…</div> : alerts.length === 0 ? <div className="p-8 text-center"><p className="text-sm font-medium">No active alerts</p><p className="text-[11px] text-secondary mt-1">Alerts appear only when persisted observations show a material flow change or elevated risk state.</p></div> : alerts.map((alert) => (
          <Link key={alert.address} href={"/token/" + alert.address} className="block px-3 py-4 border-b border-border last:border-0 hover:bg-bg/40">
            <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{"$" + (alert.symbol || "TOKEN")}</p><p className="text-[10px] font-mono text-secondary">{shortCa(alert.address)} · {alert.severity}</p></div><span className="text-[9px] uppercase tracking-wide text-risky">Observed</span></div>
            {alert.evidence.slice(0, 3).map((e, i) => <div key={i} className="mt-2"><p className="text-[11px] font-medium">{e.title}</p><p className="text-[10px] text-secondary leading-relaxed">{e.detail}</p></div>)}
          </Link>
        ))}
      </section>
      <p className="text-[10px] text-secondary text-center mt-4 leading-relaxed">Alerts are browser-local and refresh when this page is opened. They are not push notifications.</p>
      <TerminalNav />
    </main>
  );
}
