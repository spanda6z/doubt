export type VerdictType = "SAFE" | "CAUTION" | "RISKY" | "AVOID";
export type ConfidenceType = "LOW" | "MEDIUM" | "HIGH";
export type SeverityType = "red" | "yellow" | "blue";

export interface ExitBuy {
  exit_value: number;
  delta_pct: number;
}

export interface ExitMath {
  buy_100: ExitBuy;
  buy_500: ExitBuy;
  buy_5000: ExitBuy;
  cascade_500: ExitBuy;
  time_to_exit_minutes: number;
  mev_tax_pct: number;
}

export interface TopSeller {
  wallet: string;
  amount_usd: number;
  solscan: string;
}

export interface ReverseFlow {
  ratio: number;
  smart_in_usd: number;
  insider_out_usd: number;
  top_sellers: TopSeller[];
  sniper_offload_count: number;
  dev_wallet_status: string;
}

export interface DeathData {
  narrative_tag: string;
  stage: string;
  median_lifespan_minutes: number;
  current_age_minutes: number;
  survival_6h: number;
  survival_24h: number;
  holder_velocity: number;
  volume_decay: number;
}

export interface Reason {
  text: string;
  severity: SeverityType;
  evidence?: string | null;
}

export interface Scores {
  exit: number;
  flow: number;
  death: number;
}

export interface VerdictResponse {
  mint: string;
  symbol: string;
  name: string;
  image_url?: string | null;
  verdict: VerdictType;
  rug_probability: number;
  combined_score: number;
  scores: Scores;
  exit_math: ExitMath;
  reverse_flow: ReverseFlow;
  death_data: DeathData;
  reasons: Reason[];
  confidence: ConfidenceType;
  computed_at: string;
  tweet_text?: string | null;
}
