import { computeExit } from "./exit-engine";

export type RadarTab = "radar" | "fresh" | "fading";

export type RadarItem = {
  mint: string;
  symbol: string;
  name: string;
  image_url: string | null;
  price_usd: number;
  liquidity_usd: number;
  volume_1h_usd: number;
  volume_24h_usd: number;
  age_minutes: number;
  verdict: "SAFE" | "CAUTION" | "RISKY" | "AVOID";
  combined_score: number;
  rug_probability: number;
  exit_delta_500: number;
  cascade_delta_500: number;
  time_to_exit_minutes: number;
  price_change_m5: number | null;
  price_change_h1: number | null;
  url?: string;
};

function verdictFromScore(score: number): RadarItem["verdict"] {
  if (score >= 75) return "SAFE";
  if (score >= 55) return "CAUTION";
  if (score >= 35) return "RISKY";
  return "AVOID";
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 40 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type DexPair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  liquidity?: { usd?: number };
  volume?: { h1?: number; h24?: number; m5?: number };
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  pairCreatedAt?: number;
  url?: string;
  info?: { imageUrl?: string };
};

function pickBestPair(pairs: DexPair[], mint: string): DexPair | null {
  const sol = pairs.filter(
    (p) =>
      p.chainId === "solana" &&
      (p.baseToken?.address || "").toLowerCase() === mint.toLowerCase()
  );
  if (!sol.length) return null;
  sol.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  return sol[0];
}

function pairToItem(pair: DexPair, mint: string): RadarItem | null {
  const liq = pair.liquidity?.usd || 0;
  const vol1h = pair.volume?.h1 || 0;
  const vol24 = pair.volume?.h24 || 0;
  const created = pair.pairCreatedAt || Date.now();
  const ageMin = Math.max(0, (Date.now() - created) / 60000);
  const price = Number(pair.priceUsd || 0);

  const exit = computeExit({
    total_liquidity_usd: liq,
    top10_holder_pct: 35,
    mev_share_pct: 8,
    lp_locked_pct: 0,
    volume_1h_usd: vol1h,
    age_minutes: ageMin,
    tx_count_1h: Math.max(5, Math.round(vol1h / 50) || 10),
  });

  const flow = 55;
  const death =
    ageMin < 60 ? 70 : ageMin < 240 ? 55 : ageMin < 720 ? 40 : 25;
  let combined = Math.round(
    exit.exit_score * 0.4 + flow * 0.35 + death * 0.25
  );
  combined = Math.max(0, Math.min(100, combined));

  const ch1 = pair.priceChange?.h1;
  if (typeof ch1 === "number" && ch1 < -20) {
    combined = Math.min(combined, 45);
  }
  if (liq < 3000) combined = Math.min(combined, 35);
  if (liq < 1000) combined = Math.min(combined, 20);

  const cascadeDelta =
    Math.round(((exit.cascade_exit_500 - 500) / 500) * 10000) / 100;

  return {
    mint,
    symbol: pair.baseToken?.symbol || "???",
    name: pair.baseToken?.name || "Unknown",
    image_url: pair.info?.imageUrl || null,
    price_usd: price,
    liquidity_usd: liq,
    volume_1h_usd: vol1h,
    volume_24h_usd: vol24,
    age_minutes: Math.round(ageMin),
    verdict: verdictFromScore(combined),
    combined_score: combined,
    rug_probability: 100 - combined,
    exit_delta_500: exit.exit_delta_500,
    cascade_delta_500: cascadeDelta,
    time_to_exit_minutes: exit.time_to_exit_minutes,
    price_change_m5:
      typeof pair.priceChange?.m5 === "number" ? pair.priceChange.m5 : null,
    price_change_h1: typeof ch1 === "number" ? ch1 : null,
    url: pair.url,
  };
}

function collectMints(
  ...lists: Array<Array<{ chainId?: string; tokenAddress?: string }> | null>
): string[] {
  const mints = new Set<string>();
  for (const list of lists) {
    for (const t of list || []) {
      if (t.chainId === "solana" && t.tokenAddress) {
        mints.add(t.tokenAddress);
      }
    }
  }
  return [...mints];
}

async function fetchSearchMints(): Promise<string[]> {
  const queries = ["solana", "bonk", "meme"];
  const found = new Set<string>();
  await Promise.all(
    queries.map(async (q) => {
      const data = await fetchJson<{ pairs?: DexPair[] }>(
        `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(q)}`
      );
      for (const p of data?.pairs || []) {
        if (p.chainId !== "solana") continue;
        const addr = p.baseToken?.address;
        if (!addr) continue;
        if (addr === "So11111111111111111111111111111111111111112") continue;
        const liq = p.liquidity?.usd || 0;
        const age = p.pairCreatedAt
          ? (Date.now() - p.pairCreatedAt) / 60000
          : 99999;
        if (liq >= 800 && age < 60 * 24 * 14) found.add(addr);
      }
    })
  );
  return [...found];
}

export async function fetchRadarItems(): Promise<RadarItem[]> {
  type Boost = { chainId?: string; tokenAddress?: string };

  const [boostsTop, boostsLatest, profiles, searchMints] = await Promise.all([
    fetchJson<Boost[]>("https://api.dexscreener.com/token-boosts/top/v1"),
    fetchJson<Boost[]>("https://api.dexscreener.com/token-boosts/latest/v1"),
    fetchJson<Boost[]>("https://api.dexscreener.com/token-profiles/latest/v1"),
    fetchSearchMints(),
  ]);

  const mintList = [
    ...collectMints(boostsTop, boostsLatest, profiles),
    ...searchMints,
  ];
  const ordered: string[] = [];
  const seenMint = new Set<string>();
  for (const m of mintList) {
    if (seenMint.has(m)) continue;
    seenMint.add(m);
    ordered.push(m);
  }
  const capped = ordered.slice(0, 60);
  if (!capped.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < capped.length; i += 20) {
    chunks.push(capped.slice(i, i + 20));
  }

  const items: RadarItem[] = [];
  const seen = new Set<string>();

  await Promise.all(
    chunks.map(async (chunk) => {
      const data = await fetchJson<{ pairs?: DexPair[] }>(
        `https://api.dexscreener.com/latest/dex/tokens/${chunk.join(",")}`
      );
      const pairs = data?.pairs || [];
      for (const mint of chunk) {
        if (seen.has(mint)) continue;
        const best = pickBestPair(pairs, mint);
        if (!best) continue;
        const item = pairToItem(best, mint);
        if (!item) continue;
        if (item.liquidity_usd < 400 && item.age_minutes > 45) continue;
        seen.add(mint);
        items.push(item);
      }
    })
  );

  return items;
}

export function sortRadar(items: RadarItem[], tab: RadarTab): RadarItem[] {
  const copy = [...items];
  if (tab === "fresh") {
    return copy.sort((a, b) => a.age_minutes - b.age_minutes);
  }
  if (tab === "fading") {
    return copy
      .filter(
        (i) =>
          i.exit_delta_500 <= -15 ||
          (i.price_change_h1 !== null && i.price_change_h1 < -12) ||
          i.combined_score < 50
      )
      .sort(
        (a, b) =>
          a.combined_score - b.combined_score ||
          a.exit_delta_500 - b.exit_delta_500
      );
  }
  return copy.sort(
    (a, b) =>
      b.combined_score - a.combined_score ||
      b.volume_1h_usd - a.volume_1h_usd
  );
}
