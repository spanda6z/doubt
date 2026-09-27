"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtAge, fmtPct, fmtUsd, shortCa } from "@/lib/format";
import { Panel, Row, Unavailable } from "./Panel";
import type { ExitMathResult } from "@/lib/exit-math";

type CaseData = {
  address: string;
  available: boolean;
  reason?: string;
  symbol?: string | null;
  name?: string | null;
  image_url?: string | null;
  age_minutes?: number | null;
  market?: {
    price_usd: number | null;
    market_cap_usd: number | null;
    liquidity_usd: number | null;
    volume_1h_usd: number | null;
    volume_24h_usd: number | null;
    price_change_h1: number | null;
  } | null;
  liquidity?: {
    liquidity_usd: number | null;
    liq_mc_ratio: number | null;
    exit_ladder: {
      position_usd: number;
      estimated_exit: number | null;
      round_trip_cost_pct: number | null;
      impact_label: string;
      available: boolean;
    }[];
  } | null;
  flow?: {
    available: boolean;
    source?: string;
    observed?: {
      buys?: number;
      sells?: number;
      buy_volume_usd?: number;
      sell_volume_usd?: number;
      net_flow_usd?: number;
      buy_pressure?: number;
      unique_buyers?: number;
      unique_sellers?: number;
      confidence?: string;
    } | null;
    buys_5m: number | null;
    sells_5m: number | null;
    buys_1h: number | null;
    sells_1h: number | null;
    buy_sell_ratio_1h: number | null;
  } | null;
  holders?: {
    available: boolean;
    reason?: string | null;
    total?: number | null;
    top10_pct?: number | null;
    top20_pct?: number | null;
    top25_pct?: number | null;
    confidence?: string;
    source?: string;
    largest?: { rank: number; owner: string; pct: number | null }[];
  } | null;
  dev?: {
    available: boolean;
    reason?: string | null;
    creator?: string | null;
    authority_addresses?: string[];
    related_mints?: string[];
    earliest_observed_signature?: string | null;
    confidence?: string;
    source?: string;
    disclaimer?: string;
  } | null;
  contract?: {
    available: boolean;
    reason?: string;
    mint_authority?: string | null;
    freeze_authority?: string | null;
    token_program?: string | null;
    authorities?: { address: string; scopes: string[] }[];
    source?: string;
    pool_dex?: string | null;
  } | null;
  exit_math?: {
    sizes: ExitMathResult[];
    default_100: ExitMathResult;
  } | null;
  evidence?: {
    category: string;
    flag: string;
    severity: string;
    title: string;
    detail: string;
  }[];
  computed_at?: string;
};

const SIZES = [25, 50, 100, 250, 500, 1000];

const SEV: Record<string, string> = {
  info: "text-secondary",
  low: "text-secondary",
  medium: "text-caution",
  high: "text-risky",
  critical: "text-avoid",
};

export function CaseFile({ data }: { data: CaseData }) {
  const [size, setSize] = useState(100);
  const [custom, setCustom] = useState("");

  const exit = useMemo(() => {
    if (!data.exit_math?.sizes) return null;
    const fromLadder = data.exit_math.sizes.find((s) => s.position_usd === size);
    return fromLadder || data.exit_math.default_100;
  }, [data.exit_math, size]);

  function onCustom() {
    const n = Number(custom);
    if (n > 0) setSize(n);
  }

  if (!data.available) {
    return (
      <main className="min-h-dvh max-w-lg mx-auto px-4 py-6 space-y-4">
        <Link href="/" className="text-xs text-secondary hover:text-primary">
          ← Doubt
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">CASE FILE</h1>
        <p className="font-mono text-xs text-secondary break-all">{data.address}</p>
        <Unavailable reason={data.reason || "No market data for this mint."} />
      </main>
    );
  }

  const m = data.market;

  return (
    <main className="min-h-dvh max-w-lg mx-auto flex flex-col pb-10">
      <header className="sticky top-0 z-20 bg-bg/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <Link href="/" className="text-xs text-secondary hover:text-primary">
            ← Doubt
          </Link>
          <span className="text-[10px] tracking-[0.14em] uppercase text-secondary">
            Case file
          </span>
        </div>
        <div className="flex items-start gap-3">
          {data.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.image_url}
              alt=""
              className="w-10 h-10 rounded-full bg-border object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-border" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold tracking-tight truncate">
              ${data.symbol || "TOKEN"}
            </h1>
            <p className="text-xs text-secondary truncate">{data.name || "—"}</p>
            <p className="text-[11px] font-mono text-secondary mt-0.5">
              Solana · {fmtAge(data.age_minutes)} · {shortCa(data.address)}
            </p>
          </div>
          <button
            type="button"
            className="text-[11px] text-secondary hover:text-primary shrink-0"
            onClick={() => navigator.clipboard.writeText(data.address)}
          >
            Copy CA
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-3">
        <Panel title="Market">
          <Row label="MC" value={fmtUsd(m?.market_cap_usd)} />
          <Row label="Liquidity" value={fmtUsd(m?.liquidity_usd)} />
          <Row label="Volume 1h" value={fmtUsd(m?.volume_1h_usd)} />
          <Row label="Volume 24h" value={fmtUsd(m?.volume_24h_usd)} />
          <Row
            label="1h change"
            value={
              <span
                className={
                  (m?.price_change_h1 ?? 0) < 0 ? "text-avoid" : "text-safe"
                }
              >
                {fmtPct(m?.price_change_h1)}
              </span>
            }
          />
          <Row
            label="Price"
            value={m?.price_usd != null ? `$${m.price_usd}` : "—"}
            muted
          />
        </Panel>

        <Panel title="Exit math">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`px-2.5 py-1 rounded-md text-xs tabular border ${
                  size === s
                    ? "border-safe text-primary bg-safe/10"
                    : "border-border text-secondary"
                }`}
              >
                ${s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mb-3">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="Custom $"
              className="flex-1 bg-bg border border-border rounded-md px-2 py-1.5 text-xs tabular"
              inputMode="decimal"
            />
            <button
              type="button"
              onClick={onCustom}
              className="text-xs px-3 border border-border rounded-md text-secondary hover:text-primary"
            >
              Apply
            </button>
          </div>

          {exit && exit.available ? (
            <div className="space-y-0.5">
              <Row label="Entry" value={fmtUsd(exit.entry_value, 2)} />
              <Row
                label="Price impact (in)"
                value={
                  exit.price_impact_entry != null
                    ? `−$${(
                        (exit.price_impact_entry / 100) *
                        exit.position_usd
                      ).toFixed(2)}`
                    : "—"
                }
              />
              <Row
                label="Price impact (out)"
                value={
                  exit.price_impact_exit != null
                    ? `−$${(
                        (exit.price_impact_exit / 100) *
                        exit.position_usd
                      ).toFixed(2)}`
                    : "—"
                }
              />
              <Row
                label="Pool fees (est.)"
                value={`−$${exit.pool_fee.toFixed(2)}`}
              />
              <div className="border-t border-border my-2" />
              <Row
                label="Estimated exit"
                value={
                  <span className="text-base font-semibold">
                    {fmtUsd(exit.estimated_exit, 2)}
                  </span>
                }
              />
              <Row
                label="Round-trip cost"
                value={
                  <span className="text-risky">
                    {fmtPct(exit.round_trip_cost_pct)}
                  </span>
                }
              />
              <Row
                label="Break-even move"
                value={fmtPct(exit.break_even_move_pct)}
              />
              <Row label="Impact" value={exit.impact_label} />
            </div>
          ) : (
            <Unavailable reason={exit?.reason || undefined} />
          )}
        </Panel>

        <Panel title="Liquidity">
          {data.liquidity?.liquidity_usd != null ? (
            <>
              <Row
                label="Liquidity"
                value={fmtUsd(data.liquidity.liquidity_usd)}
              />
              <Row
                label="Liq / MC"
                value={
                  data.liquidity.liq_mc_ratio != null
                    ? `${(data.liquidity.liq_mc_ratio * 100).toFixed(1)}%`
                    : "—"
                }
              />
              <div className="border-t border-border my-2" />
              <p className="text-[10px] uppercase tracking-wide text-secondary mb-1">
                Estimated exit impact
              </p>
              {data.liquidity.exit_ladder.map((r) => (
                <Row
                  key={r.position_usd}
                  label={`$${r.position_usd}`}
                  value={
                    r.available
                      ? `${r.impact_label}${
                          r.round_trip_cost_pct != null
                            ? ` · ${r.round_trip_cost_pct.toFixed(0)}%`
                            : ""
                        }`
                      : "—"
                  }
                />
              ))}
            </>
          ) : (
            <Unavailable />
          )}
        </Panel>

        <Panel title="Flow">
          {data.flow?.available ? (
            <>
              {data.flow.observed ? (
                <>
                  <Row label="Observed buys" value={data.flow.observed.buys ?? "—"} />
                  <Row label="Observed sells" value={data.flow.observed.sells ?? "—"} />
                  <Row label="Buy pressure" value={data.flow.observed.buy_pressure != null ? `${data.flow.observed.buy_pressure.toFixed(1)}%` : "—"} />
                  <Row label="Net flow" value={data.flow.observed.net_flow_usd != null ? fmtUsd(data.flow.observed.net_flow_usd) : "—"} />
                  <Row label="Unique buyers" value={data.flow.observed.unique_buyers ?? "—"} />
                  <Row label="Unique sellers" value={data.flow.observed.unique_sellers ?? "—"} />
                  <Row label="Confidence" value={data.flow.observed.confidence || "—"} />
                  <p className="text-[10px] text-secondary mt-2">Observed from parsed on-chain transactions. No wallet is classified as smart money here.</p>
                </>
              ) : null}
              <div className="border-t border-border my-2" />
              <Row label="Buys 1h (market)" value={data.flow.buys_1h ?? "—"} />
              <Row label="Sells 1h (market)" value={data.flow.sells_1h ?? "—"} />
              <Row
                label="Buy / sell ratio"
                value={
                  data.flow.buy_sell_ratio_1h != null
                    ? `${data.flow.buy_sell_ratio_1h}×`
                    : "—"
                }
              />
              <Row label="Buys 5m" value={data.flow.buys_5m ?? "—"} />
              <Row label="Sells 5m" value={data.flow.sells_5m ?? "—"} />
            </>
          ) : (
            <Unavailable reason="Transaction flow not fully available from market feed." />
          )}
        </Panel>

        <Panel title="Holders">
          {data.holders?.available ? (
            <>
              <Row label="Observed holders" value={data.holders.total ?? "—"} />
              <Row
                label="Top 10 concentration"
                value={
                  data.holders.top10_pct != null
                    ? `${data.holders.top10_pct.toFixed(1)}%`
                    : "—"
                }
              />
              <Row
                label="Top 20 concentration"
                value={
                  data.holders.top20_pct != null
                    ? `${data.holders.top20_pct.toFixed(1)}%`
                    : "—"
                }
              />
              <Row
                label="Top 25 concentration"
                value={
                  data.holders.top25_pct != null
                    ? `${data.holders.top25_pct.toFixed(1)}%`
                    : "—"
                }
              />
              <Row label="Confidence" value={data.holders.confidence || "LOW"} />
              {data.holders.largest && data.holders.largest.length > 0 ? (
                <>
                  <div className="border-t border-border my-2" />
                  <p className="text-[10px] uppercase tracking-wide text-secondary mb-1">
                    Largest observed holders
                  </p>
                  {data.holders.largest.slice(0, 5).map((holder) => (
                    <Row
                      key={holder.rank}
                      label={`#${holder.rank} ${shortCa(holder.owner)}`}
                      value={
                        holder.pct != null
                          ? `${holder.pct.toFixed(2)}%`
                          : "—"
                      }
                    />
                  ))}
                </>
              ) : null}
              <p className="text-[10px] text-secondary mt-2">
                Concentration is computed from observed Helius token accounts. It
                does not classify wallets or identify intent.
              </p>
            </>
          ) : (
            <Unavailable reason={data.holders?.reason || undefined} />
          )}
        </Panel>

        <Panel title="Dev trace">
          {data.dev?.available ? (
            <>
              <Row
                label="Creator candidate"
                value={data.dev.creator ? shortCa(data.dev.creator) : "—"}
              />
              <Row label="Confidence" value={data.dev.confidence || "LOW"} />
              <Row
                label="Authority addresses"
                value={data.dev.authority_addresses?.length ?? 0}
              />
              <Row
                label="Related mints observed"
                value={data.dev.related_mints?.length ?? 0}
              />
              {data.dev.related_mints && data.dev.related_mints.length > 0 ? (
                <>
                  <div className="border-t border-border my-2" />
                  <p className="text-[10px] uppercase tracking-wide text-secondary mb-1">
                    Related activity
                  </p>
                  {data.dev.related_mints.slice(0, 5).map((mint) => (
                    <Row key={mint} label={shortCa(mint)} value="observed" />
                  ))}
                </>
              ) : null}
              <p className="text-[10px] text-secondary mt-2 leading-relaxed">
                {data.dev.disclaimer ||
                  "Candidate creator evidence only. Observed related mints are not confirmed launches."}
              </p>
            </>
          ) : (
            <Unavailable reason={data.dev?.reason || undefined} />
          )}
        </Panel>

        <Panel title="Contract">
          {data.contract?.pool_dex ? (
            <Row label="Pool" value={data.contract.pool_dex} />
          ) : null}
          {data.contract?.available ? (
            <>
              <Row
                label="Mint authority"
                value={
                  data.contract.mint_authority
                    ? shortCa(data.contract.mint_authority)
                    : "none observed"
                }
              />
              <Row
                label="Freeze authority"
                value={
                  data.contract.freeze_authority
                    ? shortCa(data.contract.freeze_authority)
                    : "none observed"
                }
              />
              <Row
                label="Token program"
                value={
                  data.contract.token_program
                    ? shortCa(data.contract.token_program)
                    : "—"
                }
              />
              <p className="text-[10px] text-secondary mt-2">
                Authority state is reported from Helius asset metadata. “None
                observed” means no matching authority was returned; it is not a
                guarantee about historical state.
              </p>
            </>
          ) : (
            <Unavailable reason={data.contract?.reason} />
          )}
        </Panel>

        <Panel title="Evidence">
          {data.evidence && data.evidence.length > 0 ? (
            <ul className="space-y-3">
              {data.evidence.map((e) => (
                <li key={e.flag} className="text-[13px]">
                  <p
                    className={`font-medium ${
                      SEV[e.severity] || "text-caution"
                    }`}
                  >
                    ⚠ {e.title}
                  </p>
                  <p className="text-secondary mt-0.5 leading-relaxed">
                    {e.detail}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-secondary">
              No material flags from available market observations.
            </p>
          )}
        </Panel>

        <p className="text-[10px] text-secondary text-center pt-2 leading-relaxed">
          Discovery only. No wallet. No swaps. Not financial advice.
          <br />
          Exit estimates are models, not guaranteed fills.
          {data.computed_at ? (
            <>
              <br />
              Computed {new Date(data.computed_at).toLocaleString()}
            </>
          ) : null}
        </p>
      </div>
    </main>
  );
}
