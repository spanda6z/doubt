import { NextRequest, NextResponse } from "next/server";
import {
  fetchPairsForMint,
  pickBestPair,
  num,
} from "@/lib/providers/dexscreener";
import { computeExit, exitLadder } from "@/lib/exit-math";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
) {
  const address = (params.address || "").trim();
  if (!MINT_RE.test(address)) {
    return NextResponse.json(
      { error: "Invalid Solana mint address", available: false },
      { status: 400 }
    );
  }

  const pairs = await fetchPairsForMint(address);
  const pair = pickBestPair(pairs, address);

  if (!pair) {
    return NextResponse.json({
      address,
      available: false,
      reason: "No Solana market data found for this mint",
      market: null,
      liquidity: null,
      flow: null,
      holders: null,
      dev: null,
      contract: null,
      exit_math: null,
      evidence: [],
      computed_at: new Date().toISOString(),
    });
  }

  const price = num(pair.priceUsd);
  const liq = num(pair.liquidity?.usd);
  const mc = num(pair.marketCap) ?? num(pair.fdv);
  const vol1h = num(pair.volume?.h1);
  const vol24h = num(pair.volume?.h24);
  const vol5m = num(pair.volume?.m5);
  const created = pair.pairCreatedAt ?? null;
  const ageMin =
    created != null
      ? Math.max(0, Math.round((Date.now() - created) / 60000))
      : null;

  const buys1h = pair.txns?.h1?.buys ?? null;
  const sells1h = pair.txns?.h1?.sells ?? null;
  const buys5m = pair.txns?.m5?.buys ?? null;
  const sells5m = pair.txns?.m5?.sells ?? null;

  let buySellRatio: number | null = null;
  if (buys1h != null && sells1h != null && sells1h > 0) {
    buySellRatio = Math.round((buys1h / sells1h) * 100) / 100;
  }

  const ladder = exitLadder(liq);
  const exit100 = computeExit({ liquidity_usd: liq, position_usd: 100 });

  const evidence: {
    category: string;
    flag: string;
    severity: string;
    title: string;
    detail: string;
    evidence: Record<string, unknown>;
  }[] = [];

  if (liq != null && liq < 5000) {
    evidence.push({
      category: "liquidity",
      flag: "thin_liquidity",
      severity: "high",
      title: "Thin liquidity",
      detail: `Reported liquidity is $${Math.round(liq).toLocaleString()}. Small exits may move the book significantly.`,
      evidence: { liquidity_usd: liq },
    });
  }

  if (liq != null && mc != null && mc > 0) {
    const ratio = liq / mc;
    if (ratio < 0.08) {
      evidence.push({
        category: "liquidity",
        flag: "low_liq_mc_ratio",
        severity: "medium",
        title: "Low liquidity vs market cap",
        detail: `Liquidity is ${(ratio * 100).toFixed(1)}% of reported market cap.`,
        evidence: { liquidity_usd: liq, market_cap_usd: mc, ratio },
      });
    }
  }

  const ch1 = pair.priceChange?.h1;
  if (typeof ch1 === "number" && ch1 <= -20) {
    evidence.push({
      category: "momentum",
      flag: "sharp_1h_drawdown",
      severity: ch1 <= -40 ? "critical" : "high",
      title: "Sharp 1h price decline",
      detail: `Price change over 1h: ${ch1.toFixed(1)}%.`,
      evidence: { price_change_h1: ch1 },
    });
  }

  if (
    exit100.available &&
    exit100.round_trip_cost_pct != null &&
    exit100.round_trip_cost_pct >= 15
  ) {
    evidence.push({
      category: "exit",
      flag: "expensive_exit_100",
      severity: exit100.round_trip_cost_pct >= 30 ? "critical" : "high",
      title: "Elevated exit cost ($100)",
      detail: `Modeled round-trip cost for a $100 position is ~${exit100.round_trip_cost_pct.toFixed(1)}%.`,
      evidence: {
        round_trip_cost_pct: exit100.round_trip_cost_pct,
        estimated_exit: exit100.estimated_exit,
      },
    });
  }

  if (
    buys1h != null &&
    sells1h != null &&
    sells1h > buys1h * 1.5 &&
    sells1h > 10
  ) {
    evidence.push({
      category: "flow",
      flag: "sell_txn_pressure",
      severity: "medium",
      title: "Sell-side transaction pressure (1h)",
      detail: `1h txns: ${buys1h} buys vs ${sells1h} sells.`,
      evidence: { buys_1h: buys1h, sells_1h: sells1h },
    });
  }

  let intelligence: Record<string, unknown> | null = null;
  let holderIntelligence: Record<string, unknown> | null = null;
  let devIntelligence: Record<string, unknown> | null = null;
  let contractIntelligence: Record<string, unknown> | null = null;
  let riskIntelligence: Record<string, unknown> | null = null;
  let marketHistory: Record<string, unknown> | null = null;
  let flowTimeline: Record<string, unknown> | null = null;
  let alertsIntelligence: Record<string, unknown> | null = null;
  try {
    const baseUrl = process.env.DOUBT_API_URL || process.env.NEXT_PUBLIC_DOUBT_API_URL;
    if (baseUrl) {
      const api = baseUrl.replace(/\\/$/, "");
      const [flowRes, holderRes, devRes, contractRes, riskRes, historyRes, timelineRes, alertsRes] = await Promise.all([
        fetch(api + "/v1/flow/" + address, { cache: "no-store" }),
        fetch(api + "/v1/holders/" + address, { cache: "no-store" }),
        fetch(api + "/v1/dev/" + address, { cache: "no-store" }),
        fetch(api + "/v1/contract/" + address, { cache: "no-store" }),
        fetch(api + "/v1/risk/" + address, { cache: "no-store" }),
        fetch(api + "/v1/market/" + address + "/history?interval=5m&hours=24", { cache: "no-store" }),
        fetch(api + "/v1/flow/" + address + "/timeline?windows=5m,15m,30m,1h&limit=50", { cache: "no-store" }),
        fetch(api + "/v1/alerts/" + address + "?limit=50", { cache: "no-store" }),
      ]);
      if (flowRes.ok) intelligence = await flowRes.json();
      if (holderRes.ok) holderIntelligence = await holderRes.json();
      if (devRes.ok) devIntelligence = await devRes.json();
      if (contractRes.ok) contractIntelligence = await contractRes.json();
      if (riskRes.ok) riskIntelligence = await riskRes.json();
      if (historyRes.ok) marketHistory = await historyRes.json();
      if (timelineRes.ok) flowTimeline = await timelineRes.json();
      if (alertsRes.ok) alertsIntelligence = await alertsRes.json();
    }
  } catch {
    intelligence = null;
    holderIntelligence = null;
    devIntelligence = null;
    contractIntelligence = null;
    riskIntelligence = null;
    marketHistory = null;
    flowTimeline = null;
    alertsIntelligence = null;
  }

  const holders = holderIntelligence
    ? {
        available: true,
        reason: null,
        total: (holderIntelligence.holder_count as number) ?? null,
        top10_pct: (holderIntelligence.top10_pct as number) ?? null,
        top20_pct: (holderIntelligence.top20_pct as number) ?? null,
        top25_pct: (holderIntelligence.top25_pct as number) ?? null,
        confidence: (holderIntelligence.confidence as string) ?? "LOW",
        source: (holderIntelligence.source as string) ?? "unavailable",
        largest: Array.isArray(holderIntelligence.largest)
          ? holderIntelligence.largest.map((row: any) => ({
              rank: Number(row.rank),
              owner: String(row.owner),
              pct: typeof row.pct === "number" ? row.pct : null,
            }))
          : [],
      }
    : {
        available: false,
        reason:
          "Holder data requires Helius token-account indexing. Not configured or unavailable.",
        total: null as number | null,
        top10_pct: null as number | null,
        top20_pct: null as number | null,
        top25_pct: null as number | null,
        confidence: "LOW",
        source: "unavailable",
        largest: [] as { rank: number; owner: string; pct: number | null }[],
      };

  const dev = devIntelligence
    ? {
        available: true,
        reason: null,
        creator: (devIntelligence.creator_candidate as string) ?? null,
        authority_addresses: Array.isArray(devIntelligence.authority_addresses)
          ? devIntelligence.authority_addresses.map(String)
          : [],
        related_mints: Array.isArray(devIntelligence.observed_related_mints)
          ? devIntelligence.observed_related_mints.map(String)
          : [],
        earliest_observed_signature:
          (devIntelligence.earliest_observed_signature as string) ?? null,
        confidence: (devIntelligence.confidence as string) ?? "LOW",
        source: (devIntelligence.source as string) ?? "unavailable",
        disclaimer:
          (devIntelligence.disclaimer as string) ??
          "Candidate creator evidence only.",
      }
    : {
        available: false,
        reason:
          "Creator trace requires Helius asset and transaction data. Not configured or unavailable.",
        creator: null as string | null,
        authority_addresses: [] as string[],
        related_mints: [] as string[],
        earliest_observed_signature: null as string | null,
        confidence: "LOW",
        source: "unavailable",
        disclaimer: "Candidate creator evidence only.",
      };

  const contract = contractIntelligence
    ? {
        available: Boolean(contractIntelligence.available),
        reason: null,
        mint_authority: (contractIntelligence.mint_authority as string) ?? null,
        freeze_authority: (contractIntelligence.freeze_authority as string) ?? null,
        token_program: (contractIntelligence.token_program as string) ?? null,
        authorities: Array.isArray(contractIntelligence.authorities)
          ? contractIntelligence.authorities
          : [],
        source: (contractIntelligence.source as string) ?? "unavailable",
        pool_dex: pair.dexId || null,
      }
    : {
        available: false,
        reason: "Authority checks require Helius asset data. Not configured or unavailable.",
        mint_authority: null as string | null,
        freeze_authority: null as string | null,
        token_program: null as string | null,
        authorities: [] as unknown[],
        source: "unavailable",
        pool_dex: pair.dexId || null,
      };

  const body = {
    address,
    available: true,
    symbol: pair.baseToken?.symbol || null,
    name: pair.baseToken?.name || null,
    image_url: pair.info?.imageUrl || null,
    pair_url: pair.url || null,
    dex_id: pair.dexId || null,
    pair_address: pair.pairAddress || null,
    age_minutes: ageMin,
    market: {
      price_usd: price,
      market_cap_usd: mc,
      liquidity_usd: liq,
      volume_5m_usd: vol5m,
      volume_1h_usd: vol1h,
      volume_24h_usd: vol24h,
      price_change_m5: pair.priceChange?.m5 ?? null,
      price_change_h1: pair.priceChange?.h1 ?? null,
      price_change_h6: pair.priceChange?.h6 ?? null,
      price_change_h24: pair.priceChange?.h24 ?? null,
    },
    liquidity: {
      liquidity_usd: liq,
      liq_mc_ratio: liq != null && mc != null && mc > 0 ? liq / mc : null,
      exit_ladder: ladder.map((r) => ({
        position_usd: r.position_usd,
        estimated_exit: r.estimated_exit,
        round_trip_cost_pct: r.round_trip_cost_pct,
        impact_label: r.impact_label,
        available: r.available,
      })),
    },
    flow: {
      available: Boolean(intelligence) || buys1h != null || sells1h != null,
      source: intelligence ? "helius_observed" : "market_feed",
      buys_5m: buys5m,
      sells_5m: sells5m,
      buys_1h: buys1h,
      sells_1h: sells1h,
      buy_sell_ratio_1h: buySellRatio,
      volume_5m_usd: vol5m,
      volume_1h_usd: vol1h,
      observed: intelligence,
    },
    holders,
    dev,
    contract,
    market_history: marketHistory || { available: false, candles: [], source: "unavailable" },
    flow_timeline: flowTimeline || { available: false, windows: [], source: "unavailable" },
    alerts: alertsIntelligence || { available: false, alerts: [], count: 0, source: "unavailable" },
    risk: riskIntelligence
      ? {
          available: true,
          severity: String(riskIntelligence.severity || "INSUFFICIENT DATA"),
          deterioration_score:
            typeof riskIntelligence.deterioration_score === "number"
              ? riskIntelligence.deterioration_score
              : null,
          confidence: String(riskIntelligence.confidence || "LOW"),
          liquidity_change_pct:
            typeof riskIntelligence.liquidity_change_pct === "number"
              ? riskIntelligence.liquidity_change_pct
              : null,
          volume_change_pct:
            typeof riskIntelligence.volume_change_pct === "number"
              ? riskIntelligence.volume_change_pct
              : null,
          holder_change_pct:
            typeof riskIntelligence.holder_change_pct === "number"
              ? riskIntelligence.holder_change_pct
              : null,
          concentration_change_pct:
            typeof riskIntelligence.concentration_change_pct === "number"
              ? riskIntelligence.concentration_change_pct
              : null,
          sell_pressure_change:
            typeof riskIntelligence.sell_pressure_change === "number"
              ? riskIntelligence.sell_pressure_change
              : null,
          exit_impact_change_pct:
            typeof riskIntelligence.exit_impact_change_pct === "number"
              ? riskIntelligence.exit_impact_change_pct
              : null,
          evidence: Array.isArray(riskIntelligence.evidence)
            ? riskIntelligence.evidence
            : [],
          source: String(riskIntelligence.source || "unavailable"),
        }
      : null,
    exit_math: {
      sizes: ladder,
      default_100: exit100,
    },
    evidence,
    computed_at: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40",
    },
  });
}
