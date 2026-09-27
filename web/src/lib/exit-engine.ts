/** Exit engine — port of Python scoring for serverless. */

export type ExitInputs = {
  total_liquidity_usd: number;
  top10_holder_pct: number;
  mev_share_pct: number;
  lp_locked_pct: number;
  volume_1h_usd: number;
  age_minutes: number;
  tx_count_1h: number;
};

export type ExitOutputs = {
  exit_delta_100: number;
  exit_delta_500: number;
  exit_delta_5000: number;
  cascade_exit_500: number;
  time_to_exit_minutes: number;
  mev_tax_pct: number;
  exit_score: number;
  flags: string[];
};

function slippagePct(size: number, liquidity: number): number {
  if (liquidity <= 0) return 100;
  return (size / (liquidity + size)) * 100;
}

function effectiveLiquidity(
  total: number,
  mevShare: number,
  lpLocked: number
): number {
  const penalty = lpLocked < 80 ? 0.5 : 0;
  return total * (1 - mevShare / 100) * (1 - penalty);
}

export function computeExit(inputs: ExitInputs): ExitOutputs {
  const flags: string[] = [];
  const L = effectiveLiquidity(
    inputs.total_liquidity_usd,
    inputs.mev_share_pct,
    inputs.lp_locked_pct
  );
  const slipMult = inputs.age_minutes < 60 ? 2 : 1;

  function exitForBuy(size: number): [number, number] {
    const entryImpact = slippagePct(size, L) * slipMult;
    const tokens = size / (1 + entryImpact / 100);
    const exitImpact = slippagePct(tokens, L) * slipMult;
    const exitValue = tokens * (1 - exitImpact / 100);
    const delta = size > 0 ? ((exitValue - size) / size) * 100 : 0;
    return [exitValue, delta];
  }

  const [, d100] = exitForBuy(100);
  const [, d500] = exitForBuy(500);
  const [, d5000] = exitForBuy(5000);

  const cascadeSize =
    (inputs.top10_holder_pct / 100) * inputs.total_liquidity_usd;
  const cascadeImpact =
    inputs.total_liquidity_usd > 0
      ? cascadeSize / (inputs.total_liquidity_usd + cascadeSize)
      : 1;
  const cascadeExit = 500 * (1 - cascadeImpact);

  const avgTx =
    inputs.tx_count_1h > 0
      ? inputs.volume_1h_usd / Math.max(inputs.tx_count_1h, 1)
      : 100;
  const depth1 = inputs.total_liquidity_usd * 0.01;
  let minutes = 999;
  if (depth1 > 0 && avgTx > 0) {
    minutes = Math.min(
      999,
      Math.max(0, Math.round((500 / depth1) * (1 / Math.max(avgTx, 1)) * 60))
    );
  }

  let score = 100;
  score -= Math.min(40, Math.abs(d500));
  score -= Math.min(20, Math.abs(d5000));
  score -= Math.min(20, minutes / 5);
  score -= Math.min(20, inputs.mev_share_pct);
  score = Math.max(0, Math.min(100, Math.round(score)));

  if (inputs.total_liquidity_usd < 5000) {
    flags.push("MICRO LIQUIDITY");
    score = Math.min(score, 30);
  }
  if (inputs.lp_locked_pct < 80) {
    flags.push("LP UNLOCKED");
    score = Math.min(score, 20);
  }
  if (inputs.age_minutes < 60) flags.push("NEW POOL");

  return {
    exit_delta_100: Math.round(d100 * 100) / 100,
    exit_delta_500: Math.round(d500 * 100) / 100,
    exit_delta_5000: Math.round(d5000 * 100) / 100,
    cascade_exit_500: Math.round(cascadeExit * 100) / 100,
    time_to_exit_minutes: minutes,
    mev_tax_pct: Math.round(inputs.mev_share_pct * 100) / 100,
    exit_score: score,
    flags,
  };
}
