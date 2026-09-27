/** Isolated exit-math — mirror of packages/exit-math. No invented liquidity. */

export type ExitMathInput = {
  liquidity_usd: number | null | undefined;
  position_usd: number;
  fee_bps?: number;
  mev_share_pct?: number;
};

export type ExitMathResult = {
  position_usd: number;
  entry_value: number;
  price_impact_entry: number | null;
  price_impact_exit: number | null;
  pool_fee: number;
  other_cost: number;
  estimated_exit: number | null;
  round_trip_cost_pct: number | null;
  break_even_move_pct: number | null;
  impact_label: string;
  available: boolean;
  reason: string | null;
};

function impactPct(size: number, liquidity: number): number {
  if (liquidity <= 0) return 100;
  return (size / (liquidity + size)) * 100;
}

export function impactLabel(deltaPct: number): string {
  const d = Math.abs(deltaPct);
  if (d < 2) return "Low";
  if (d < 5) return "Moderate";
  if (d < 12) return "Elevated";
  if (d < 25) return "Severe";
  return "Extreme";
}

export function computeExit(inp: ExitMathInput): ExitMathResult {
  const pos = Number(inp.position_usd);
  if (!pos || pos <= 0) {
    return {
      position_usd: pos || 0,
      entry_value: 0,
      price_impact_entry: null,
      price_impact_exit: null,
      pool_fee: 0,
      other_cost: 0,
      estimated_exit: null,
      round_trip_cost_pct: null,
      break_even_move_pct: null,
      impact_label: "Unavailable",
      available: false,
      reason: "Position size must be positive",
    };
  }

  const liq = inp.liquidity_usd;
  if (liq == null || liq <= 0) {
    return {
      position_usd: pos,
      entry_value: pos,
      price_impact_entry: null,
      price_impact_exit: null,
      pool_fee: 0,
      other_cost: 0,
      estimated_exit: null,
      round_trip_cost_pct: null,
      break_even_move_pct: null,
      impact_label: "Unavailable",
      available: false,
      reason: "Insufficient liquidity or market data",
    };
  }

  const feeBps = inp.fee_bps ?? 25;
  const mev = inp.mev_share_pct ?? 0;
  let effective = liq * Math.max(0, 1 - mev / 100);
  if (effective <= 0) effective = liq;

  const entryImpact = impactPct(pos, effective);
  const tokens = pos * (1 - entryImpact / 100);
  const exitImpact = impactPct(tokens, effective);
  const grossExit = tokens * (1 - exitImpact / 100);
  const fee = pos * (feeBps / 10_000) * 2;
  const other = pos * (mev / 100) * 0.15;
  const netExit = Math.max(0, grossExit - fee - other);
  const roundTrip = ((pos - netExit) / pos) * 100;
  const breakEven =
    roundTrip < 100 ? (100 / (100 - roundTrip) - 1) * 100 : null;

  return {
    position_usd: pos,
    entry_value: pos,
    price_impact_entry: Math.round(entryImpact * 10000) / 10000,
    price_impact_exit: Math.round(exitImpact * 10000) / 10000,
    pool_fee: Math.round(fee * 10000) / 10000,
    other_cost: Math.round(other * 10000) / 10000,
    estimated_exit: Math.round(netExit * 10000) / 10000,
    round_trip_cost_pct: Math.round(roundTrip * 10000) / 10000,
    break_even_move_pct:
      breakEven != null ? Math.round(breakEven * 10000) / 10000 : null,
    impact_label: impactLabel(roundTrip),
    available: true,
    reason: null,
  };
}

export function exitLadder(
  liquidity_usd: number | null | undefined,
  sizes: number[] = [25, 50, 100, 250, 500, 1000]
): ExitMathResult[] {
  return sizes.map((s) =>
    computeExit({ liquidity_usd, position_usd: s })
  );
}
