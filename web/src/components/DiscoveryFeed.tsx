"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { RadarItem, RadarTab } from "@/lib/radar";
import { fmtAge, fmtUsd, fmtPct } from "@/lib/format";

export function DiscoveryFeed({
  initialTab,
  title,
  subtitle,
}: {
  initialTab: RadarTab;
  title: string;
  subtitle?: string;
}) {
  const [tab, setTab] = useState<RadarTab>(initialTab);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (t: RadarTab) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/radar?tab=${t}&limit=50`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError("Could not load feed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-sm font-semibold tracking-[0.14em] uppercase">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-secondary mt-1">{subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => load(tab)}
          className="text-[11px] text-secondary hover:text-primary"
        >
          Refresh
        </button>
      </div>

      {initialTab === "radar" && (
        <div className="flex gap-1 border-b border-border">
          {(["radar", "fresh", "fading"] as RadarTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-xs uppercase tracking-wide border-b-2 ${
                tab === t
                  ? "border-safe text-primary"
                  : "border-transparent text-secondary"
              }`}
            >
              {t === "radar" ? "All" : t}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-card border border-border rounded-xl animate-pulse"
            />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-secondary py-8 text-center">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-secondary py-8 text-center">
          DATA UNAVAILABLE — no tokens in this feed right now.
        </p>
      )}

      {!loading &&
        items.map((item) => (
          <Link
            key={item.mint}
            href={`/token/${item.mint}`}
            className="block border border-border rounded-xl p-3 hover:border-secondary/40 transition-colors"
          >
            <div className="flex justify-between items-start gap-2 mb-2">
              <div>
                <p className="font-semibold text-[15px]">${item.symbol}</p>
                <p className="text-[11px] text-secondary">
                  Solana · {fmtAge(item.age_minutes)}
                </p>
              </div>
              <span className="text-[11px] text-secondary uppercase tracking-wide">
                View case →
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[12px]">
              <div>
                <p className="text-[10px] text-secondary uppercase">Liq</p>
                <p className="tabular font-medium">
                  {item.liquidity_usd > 0 ? fmtUsd(item.liquidity_usd) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-secondary uppercase">Vol 1h</p>
                <p className="tabular font-medium">
                  {item.volume_1h_usd > 0 ? fmtUsd(item.volume_1h_usd) : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-secondary uppercase">1h</p>
                <p className="tabular font-medium">
                  {fmtPct(item.price_change_h1)}
                </p>
              </div>
            </div>
            {item.exit_delta_500 <= -15 && (
              <p className="mt-2 text-[11px] text-caution">
                ⚠ Exit liquidity pressure on $500 size
              </p>
            )}
          </Link>
        ))}
    </div>
  );
}
