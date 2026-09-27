"use client";

import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";

const demo = [
  { symbol: "MOONCAT", doubt: 68, flow: "81↑", state: "Liquidity $24K" },
  { symbol: "DOGAI", doubt: 54, flow: "72↑", state: "Volume expanding" },
  { symbol: "PEPE2", doubt: 42, flow: "64→", state: "Stable" },
];

export default function WatchPage() {
  return (
    <main className="min-h-dvh max-w-lg mx-auto px-3 pb-24">
      <header className="pt-5 pb-4 flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-[0.2em] text-secondary">Research</p><h1 className="text-xl font-bold">Watch</h1></div><span className="text-[10px] text-secondary">Local workspace</span></header>
      <section className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">Saved</p><p className="text-lg font-semibold">0</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">Alerts</p><p className="text-lg font-semibold">0</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-[9px] text-secondary uppercase">History</p><p className="text-lg font-semibold">—</p></div>
      </section>
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-3 py-3 border-b border-border"><p className="text-sm font-semibold">Watchlist</p><p className="text-[10px] text-secondary mt-0.5">Pin cases as you research them.</p></div>
        {demo.map((x) => <div key={x.symbol} className="px-3 py-3 border-b border-border last:border-0 flex items-center justify-between"><div><p className="text-sm font-semibold">{"$"}{x.symbol}</p><p className="text-[10px] text-secondary mt-0.5">{x.state}</p></div><div className="text-right"><p className="text-xs font-semibold">Doubt {x.doubt}</p><p className="text-[10px] text-safe">Flow {x.flow}</p></div></div>)}
      </section>
      <div className="mt-3 rounded-xl border border-border bg-card p-4"><p className="text-xs font-semibold">Workspace</p><p className="mt-1 text-[11px] leading-5 text-secondary">This surface is ready for persistent saved cases and event alerts. It currently stays local to the product shell.</p><Link href="/discover" className="inline-block mt-3 text-xs text-safe">Open Discover →</Link></div>
      <TerminalNav />
    </main>
  );
}
