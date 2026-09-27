-- Doubt Week 1 schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL UNIQUE,
  symbol TEXT,
  name TEXT,
  image_url TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL REFERENCES tokens(address),
  pair_address TEXT,
  dex_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS token_snapshots (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  price DOUBLE PRECISION,
  market_cap DOUBLE PRECISION,
  liquidity DOUBLE PRECISION,
  volume_5m DOUBLE PRECISION,
  volume_1h DOUBLE PRECISION,
  volume_24h DOUBLE PRECISION,
  buys_5m INT,
  sells_5m INT,
  holders INT
);

CREATE INDEX IF NOT EXISTS idx_token_snapshots_addr_ts
  ON token_snapshots (token_address, ts DESC);

CREATE TABLE IF NOT EXISTS doubt_flags (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  category TEXT NOT NULL,
  flag TEXT NOT NULL,
  severity TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}',
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doubt_flags_addr_ts
  ON doubt_flags (token_address, ts DESC);

CREATE TABLE IF NOT EXISTS exit_estimates (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  position_usd DOUBLE PRECISION NOT NULL,
  liquidity_usd DOUBLE PRECISION,
  estimated_exit DOUBLE PRECISION,
  round_trip_cost_pct DOUBLE PRECISION,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scan_events (
  id BIGSERIAL PRIMARY KEY,
  source TEXT,
  token_address TEXT,
  payload JSONB,
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
