-- Doubt intelligence layer.
-- No execution, custody, wallet connection, or trading state.

CREATE TABLE IF NOT EXISTS flow_snapshots (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  buys INT NOT NULL DEFAULT 0,
  sells INT NOT NULL DEFAULT 0,
  buy_volume_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  sell_volume_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  unique_buyers INT NOT NULL DEFAULT 0,
  unique_sellers INT NOT NULL DEFAULT 0,
  net_flow_usd DOUBLE PRECISION NOT NULL DEFAULT 0,
  buy_pressure DOUBLE PRECISION NOT NULL DEFAULT 50,
  confidence TEXT NOT NULL DEFAULT 'LOW',
  source TEXT NOT NULL DEFAULT 'helius_enhanced_transactions'
);

CREATE INDEX IF NOT EXISTS idx_flow_snapshots_addr_ts
  ON flow_snapshots (token_address, ts DESC);

CREATE TABLE IF NOT EXISTS holder_snapshots (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  holder_count INT NOT NULL DEFAULT 0,
  top10_pct DOUBLE PRECISION,
  top20_pct DOUBLE PRECISION,
  source TEXT NOT NULL DEFAULT 'helius_getTokenAccounts'
);

CREATE INDEX IF NOT EXISTS idx_holder_snapshots_addr_ts
  ON holder_snapshots (token_address, ts DESC);

CREATE TABLE IF NOT EXISTS wallet_activity (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell','transfer')),
  amount_usd DOUBLE PRECISION,
  signature TEXT,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_activity_token_ts
  ON wallet_activity (token_address, ts DESC);

CREATE TABLE IF NOT EXISTS creator_profiles (
  token_address TEXT PRIMARY KEY,
  creator_address TEXT,
  previous_launches INT NOT NULL DEFAULT 0,
  active_related_tokens INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
