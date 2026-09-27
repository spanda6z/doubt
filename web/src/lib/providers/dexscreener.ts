/** DexScreener provider — real data only. Missing fields stay null. */

export type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; name?: string; symbol?: string };
  quoteToken?: { address?: string; name?: string; symbol?: string };
  priceUsd?: string;
  priceChange?: { m5?: number; h1?: number; h6?: number; h24?: number };
  liquidity?: { usd?: number; base?: number; quote?: number };
  volume?: { m5?: number; h1?: number; h6?: number; h24?: number };
  txns?: {
    m5?: { buys?: number; sells?: number };
    h1?: { buys?: number; sells?: number };
    h6?: { buys?: number; sells?: number };
    h24?: { buys?: number; sells?: number };
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: { imageUrl?: string; header?: string };
};

export async function fetchPairsForMint(mint: string): Promise<DexPair[]> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      {
        headers: { accept: "application/json" },
        next: { revalidate: 30 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const pairs = (data.pairs || []) as DexPair[];
    return pairs.filter((p) => p.chainId === "solana");
  } catch {
    return [];
  }
}

export function pickBestPair(pairs: DexPair[], mint: string): DexPair | null {
  const match = pairs.filter(
    (p) =>
      (p.baseToken?.address || "").toLowerCase() === mint.toLowerCase()
  );
  if (!match.length) return null;
  match.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
  return match[0];
}

export function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
