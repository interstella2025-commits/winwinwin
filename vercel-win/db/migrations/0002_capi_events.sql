-- Idempotency and browser attribution for Meta Conversions API.
-- The app also creates this table on first use (CREATE TABLE IF NOT EXISTS), so notify
-- keeps working before this file is applied by hand.
CREATE TABLE IF NOT EXISTS capi_events (
  event_key TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  sent_at TEXT NOT NULL,
  detail TEXT
);
