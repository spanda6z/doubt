"use client";

import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";

const groups = [
  { title: "Research", items: [["Saved Cases", "Previous token investigations", "/watch"], ["Watchlist", "Monitor changing conditions", "/watch"], ["Alerts", "Liquidity, flow and risk changes", "/watch"], ["History", "Recently checked contracts", "/watch"]] },
  { title: "Intelligence", items: [["Smart Money", "Wallets with observable early activity", "/more"], ["Wallet Explorer", "Inspect wallet behavior", "/more"], ["Compare", "Put cases side by side", "/more"], ["Market Heatmap", "See market conditions at a glance", "/more"]] },
  { title: "Tools", items: [["Exit Calculator", "Model size, impact and downside", "/more"], ["Token Lookup", "Open any Solana mint", "/"], ["Methodology", "How Doubt computes its signals", "/more"], ["Data Sources", "Understand where the data comes from", "/more"]] },
];

export default function MorePage() {
  return (
    <main className="min-h-dvh max-w-lg mx-auto px-3 pb-24">
      <header className="pt-5 pb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-secondary">Control center</p><h1 className="text-2xl font-bold tracking-tight mt-1">More</h1><p className="text-xs text-secondary mt-1">Research tools around the discovery engine.</p></header>
      <div className="space-y-3">
        {groups.map((group) => <section key={group.title} className="rounded-xl border border-border bg-card overflow-hidden"><div className="px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-[0.16em] text-secondary">{group.title}</div>{group.items.map(([title, subtitle, href]) => <Link key={title} href={href} className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0 hover:bg-white/[0.02]"><div className="min-w-0"><p className="text-sm font-medium">{title}</p><p className="text-[10px] text-secondary mt-0.5 truncate">{subtitle}</p></div><span className="text-secondary ml-3">›</span></Link>)}</section>)}
        <section className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-semibold">Doubt</p><p className="text-[11px] text-secondary mt-1 leading-5">Discovery only. No wallet connection. No swaps. No custody. Exit math is an analytical estimate, not an execution quote.</p><div className="mt-3 flex gap-3 text-[10px] text-secondary"><span>Terms</span><span>Privacy</span><span>Risk Disclosure</span></div></section>
      </div>
      <TerminalNav />
    </main>
  );
}
