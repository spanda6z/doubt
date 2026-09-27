import { NextRequest, NextResponse } from "next/server";
import { computeExit } from "@/lib/exit-engine";

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function stubOverview(mint: string) {
  const seed = [...mint.slice(-6)].reduce((a, c) => a + c.charCodeAt(0), 0) % 100;
  const liq = 8000 + seed * 120;
  return {
    price_usd: 0.00012 + seed * 0.00001,
    market_cap_usd: liq * 8,
    liquidity_usd: liq,
    volume_1h_usd: 1200 + seed * 40,
    volume_24h_usd: 18000 + seed * 300,
    holder: 400 + seed * 3,
    trade_1h: 30 + (seed % 20),
  };
}

async function fetchBirdeye(mint: string) {
  const key = process.env.BIRDEYE_API_KEY;
  if (!key) return stubOverview(mint);
  try {
    const res = await fetch(
      `https://public-api.birdeye.so/defi/token_overview?address=${mint}`,
      {
        headers: {
          "X-API-KEY": key,
          "x-chain": "solana",
          accept: "application/json",
        },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return stubOverview(mint);
    const data = await res.json();
    const d = data.data || {};
    return {
      price_usd: Number(d.price || 0),
      market_cap_usd: Number(d.mc || 0),
      liquidity_usd: Number(d.liquidity || 0),
      volume_1h_usd: Number(d.v1hUSD || d.v1h || 0),
      volume_24h_usd: Number(d.v24hUSD || d.v24h || 0),
      holder: Number(d.holder || 0),
      trade_1h: Number(d.trade1h || 10),
    };
  } catch {
    return stubOverview(mint);
  }
}

async function fetchMeta(mint: string) {
  const key = process.env.HELIUS_API_KEY;
  if (!key) {
    return { symbol: "TOKEN", name: "Unknown Token", image_url: null as string | null };
  }
  try {
    const res = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${key}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "doubt",
          method: "getAsset",
          params: { id: mint },
        }),
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) {
      return { symbol: "TOKEN", name: "Unknown Token", image_url: null as string | null };
    }
    const data = await res.json();
    const result = data.result || {};
    const content = result.content || {};
    const metadata = content.metadata || {};
    const links = content.links || {};
    const tokenInfo = result.token_info || {};
    return {
      symbol: metadata.symbol || tokenInfo.symbol || "TOKEN",
      name: metadata.name || "Unknown Token",
      image_url: links.image || content.json_uri || null,
    };
  } catch {
    return { symbol: "TOKEN", name: "Unknown Token", image_url: null as string | null };
  }
}

function verdictFromScore(score: number) {
  if (score >= 75) return "SAFE";
  if (score >= 55) return "CAUTION";
  if (score >= 35) return "RISKY";
  return "AVOID";
}

function confidence(ageMin: number, liq: number) {
  if (ageMin < 30 || liq < 10_000) return "LOW";
  if (ageMin < 24 * 60 && liq > 10_000) return "MEDIUM";
  if (ageMin >= 24 * 60 && liq > 50_000) return "HIGH";
  return "MEDIUM";
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { mint: string } }
) {
  const mint = (params.mint || "").trim();
  if (!MINT_RE.test(mint)) {
    return NextResponse.json(
      { detail: "That doesn't look like a Solana mint address." },
      { status: 400 }
    );
  }

  const [meta, overview] = await Promise.all([
    fetchMeta(mint),
    fetchBirdeye(mint),
  ]);

  const age_minutes = 180;
  const exit = computeExit({
    total_liquidity_usd: overview.liquidity_usd,
    top10_holder_pct: 35,
    mev_share_pct: 8,
    lp_locked_pct: 0,
    volume_1h_usd: overview.volume_1h_usd,
    age_minutes,
    tx_count_1h: Math.max(overview.trade_1h || 10, 1),
  });

  const flow_score = 55;
  const death_score = 55;
  let combined = Math.round(
    exit.exit_score * 0.4 + flow_score * 0.35 + death_score * 0.25
  );
  combined = Math.max(0, Math.min(100, combined));
  const verdict = verdictFromScore(combined);
  const rug_probability = 100 - combined;

  const buy = (size: number, delta: number) => ({
    exit_value: Math.round(size * (1 + delta / 100) * 100) / 100,
    delta_pct: delta,
  });

  const reasons: { text: string; severity: string; evidence?: string }[] = [];
  if (exit.flags.includes("MICRO LIQUIDITY")) {
    reasons.push({
      text: `Micro liquidity ($${Math.round(overview.liquidity_usd).toLocaleString()})`,
      severity: "red",
    });
  }
  if (exit.flags.includes("LP UNLOCKED")) {
    reasons.push({
      text: "LP unlocked — treat as high risk",
      severity: "red",
    });
  }
  if (Math.abs(exit.exit_delta_500) >= 25) {
    reasons.push({
      text: `Exit after $500 buy ≈ ${exit.exit_delta_500 >= 0 ? "+" : ""}${Math.round(exit.exit_delta_500)}%`,
      severity: exit.exit_delta_500 < -30 ? "red" : "yellow",
    });
  }
  if (exit.mev_tax_pct >= 10) {
    reasons.push({
      text: `MEV tax estimate ${Math.round(exit.mev_tax_pct)}% of volume`,
      severity: "yellow",
    });
  }
  if (reasons.length === 0) {
    reasons.push({
      text: "Limited data — exit math only",
      severity: "yellow",
    });
  }

  const body = {
    mint,
    symbol: meta.symbol,
    name: meta.name,
    image_url: meta.image_url,
    verdict,
    rug_probability,
    combined_score: combined,
    scores: { exit: exit.exit_score, flow: flow_score, death: death_score },
    exit_math: {
      buy_100: buy(100, exit.exit_delta_100),
      buy_500: buy(500, exit.exit_delta_500),
      buy_5000: buy(5000, exit.exit_delta_5000),
      cascade_500: {
        exit_value: exit.cascade_exit_500,
        delta_pct:
          Math.round(((exit.cascade_exit_500 - 500) / 500) * 10000) / 100,
      },
      time_to_exit_minutes: exit.time_to_exit_minutes,
      mev_tax_pct: exit.mev_tax_pct,
    },
    reverse_flow: {
      ratio: 1,
      smart_in_usd: 0,
      insider_out_usd: 0,
      top_sellers: [] as unknown[],
      sniper_offload_count: 0,
      dev_wallet_status: "unknown",
    },
    death_data: {
      narrative_tag: "other",
      stage: "UNKNOWN",
      median_lifespan_minutes: 0,
      current_age_minutes: age_minutes,
      survival_6h: 0.5,
      survival_24h: 0.3,
      holder_velocity: 0,
      volume_decay: 1,
    },
    reasons,
    confidence: confidence(age_minutes, overview.liquidity_usd),
    computed_at: new Date().toISOString(),
    tweet_text: `${verdict === "SAFE" ? "🔵" : verdict === "CAUTION" ? "⚠️" : verdict === "RISKY" ? "🟠" : "🔴"} ${verdict} — $${meta.symbol}\nRug probability: ${rug_probability}%\nBuy $500 → exit $${buy(500, exit.exit_delta_500).exit_value.toFixed(0)} (${exit.exit_delta_500 >= 0 ? "+" : ""}${Math.round(exit.exit_delta_500)}%)\nNot financial advice. Exit math only.`,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
