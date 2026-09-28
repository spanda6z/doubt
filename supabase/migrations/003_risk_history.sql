-- Enrich flow snapshots so deterioration can be measured without inventing state.
ALTER TABLE flow_snapshots ADD COLUMN IF NOT EXISTS liquidity_usd DOUBLE PRECISION;
ALTER TABLE flow_snapshots ADD COLUMN IF NOT EXISTS volume_1h_usd DOUBLE PRECISION;
ALTER TABLE flow_snapshots ADD COLUMN IF NOT EXISTS volume_24h_usd DOUBLE PRECISION;
ALTER TABLE flow_snapshots ADD COLUMN IF NOT EXISTS holder_count INT;
ALTER TABLE flow_snapshots ADD COLUMN IF NOT EXISTS top10_pct DOUBLE PRECISION;
