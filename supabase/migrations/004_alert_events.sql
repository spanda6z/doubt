-- Persistent research-alert events derived from observable flow/risk changes.
CREATE TABLE IF NOT EXISTS alert_events (
  id BIGSERIAL PRIMARY KEY,
  token_address TEXT NOT NULL,
  alert_type TEXT NOT NULL,
  signal TEXT NOT NULL,
  window TEXT,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  confidence TEXT,
  source TEXT,
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token_address, alert_type, signal, window, observed_at)
);

CREATE INDEX IF NOT EXISTS idx_alert_events_token_time
  ON alert_events(token_address, observed_at DESC);
