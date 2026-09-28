"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { TerminalNav } from "@/components/TerminalNav";

const groups = [
  { title: "Research", items: [["Saved Cases", "Previous token investigations", "/watch"], ["Watchlist", "Monitor changing conditions", "/watch"], ["Alerts", "Liquidity, flow and risk changes", "/alerts"], ["History", "Recently checked contracts", "/watch"]] },
  { title: "Intelligence", items: [["Smart Money", "Wallet evidence is not classified yet", "/more"], ["Wallet Explorer", "Inspect observed wallet behavior", "#wallet"], ["Compare", "Put cases side by side", "/more"], ["Market Heatmap", "See market conditions at a glance", "/more"]] },
  { title: "Tools", items: [["Exit Calculator", "Model size, impact and downside", "/more"], ["Token Lookup", "Open any Solana mint", "/"], ["Methodology", "How Doubt computes its signals", "/more"], ["Data Sources", "Understand where the data comes from", "/more"]] },
];

export default function MorePage() {
  const [address, setAddress] = useState("");
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function inspect(e: FormEvent) {
    e.preventDefault();
    const value = address.trim();
    if (!value) return;
    setLoading(true);
    try {
      const base = process.env.NEXT_PUBLIC_DOUBT_API_URL || process.env.NEXT_PUBLIC_API_URL;
      if (!base) throw new Error("API URL is not configured");
      const res = await fetch(base.replace(/\/$/, "") + "/v1/wallet/" + encodeURIComponent(value) + "?limit=100", { cache: "no-store" });
      setWallet(res.ok ? await res.json() : { available: false });
    } catch {
      setWallet({ available: false });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh max-w-lg mx-auto px-3 pb-24">
      <header className="pt-5 pb-5"><p className="text-[10px] uppercase tracking-[0.2em] text-secondary">Control center</p><h1 className="text-2xl font-bold tracking-tight mt-1">More</h1><p className="text-xs text-secondary mt-1">Research tools around the discovery engine.</p></header>
      <div className="space-y-3">
        {groups.map((group) => <section key={group.title} className="rounded-xl border border-border bg-card overflow-hidden"><div className="px-3 py-2.5 border-b border-border text-[10px] uppercase tracking-[0.16em] text-secondary">{group.title}</div>{group.items.map(([title, subtitle, href]) => <Link key={title} href={href} className="flex items-center justify-between px-3 py-3 border-b border-border last:border-0 hover:bg-white/[0.02]"><div className="min-w-0"><p className="text-sm font-medium">{title}</p><p className="text-[10px] text-secondary mt-0.5 truncate">{subtitle}</p></div><span className="text-secondary ml-3">›</span></Link>)}</section>)}

        <section id="wallet" className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Wallet Explorer</p><p className="text-[10px] text-secondary mt-0.5">Observed behavior, not a profitability label.</p></div><span className="text-[9px] uppercase tracking-wider text-secondary">Helius</span></div>
          <form onSubmit={inspect} className="mt-3 flex gap-2">
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Paste Solana wallet address" className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-[11px] outline-none" />
            <button disabled={loading} className="rounded-lg border border-primary/40 bg-primary/10 px-3 text-[10px] font-semibold text-primary">{loading ? "…" : "Inspect"}</button>
          </form>
          {wallet && <div className="mt-3 rounded-lg border border-border bg-bg p-3">
            {!wallet.available ? <p className="text-[10px] text-secondary">No wallet activity available. Check the API and Helius configuration.</p> : <>
              <div className="grid grid-cols-4 gap-2 text-center"><div><p className="text-[9px] text-secondary">TX</p><p className="text-sm font-semibold">{wallet.transactions}</p></div><div><p className="text-[9px] text-secondary">TOKENS</p><p className="text-sm font-semibold">{wallet.unique_tokens}</p></div><div><p className="text-[9px] text-secondary">BUYS</p><p className="text-sm font-semibold">{wallet.buys}</p></div><div><p className="text-[9px] text-secondary">SELLS</p><p className="text-sm font-semibold">{wallet.sells}</p></div></div>
              <div className="mt-3 space-y-1">{(wallet.tokens || []).slice(0, 8).map((t: any) => <Link key={t.mint} href={"/token/" + t.mint} className="flex justify-between border-t border-border pt-2 text-[10px]"><span className="font-mono">{t.mint.slice(0, 7)}…{t.mint.slice(-5)}</span><span className="text-secondary">B {t.buys} · S {t.sells} · {t.observations} obs</span></Link>)}</div>
              <p className="mt-3 text-[9px] text-secondary">Confidence: {wallet.confidence}. No smart-money or profitability claim is made.</p>
            </>}
          </div>}
        </section>

        <section className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-semibold">Doubt</p><p className="text-[11px] text-secondary mt-1 leading-5">Discovery only. No wallet connection. No swaps. No custody. Exit math is an analytical estimate, not an execution quote.</p><div className="mt-3 flex gap-3 text-[10px] text-secondary"><span>Terms</span><span>Privacy</span><span>Risk Disclosure</span></div></section>
      </div>
      <TerminalNav />
    </main>
  );
}
