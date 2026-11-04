-- WIN 講師班 payment backend (Postgres / Neon). Translated from the ChatGPT Sites D1 schema (drizzle 0000–0002).
-- Timestamps stay ISO-8601 TEXT to keep the original logic identical.
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  profession TEXT NOT NULL,
  stage TEXT NOT NULL,
  topic TEXT NOT NULL,
  session_code TEXT,
  line_name TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS payment_orders (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id),
  order_no TEXT NOT NULL,
  merchant TEXT NOT NULL,
  amount INTEGER NOT NULL,
  token TEXT NOT NULL,
  request_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  source TEXT NOT NULL,
  paid_at TEXT,
  provider_trade_no TEXT,
  notify_count INTEGER NOT NULL DEFAULT 0,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_id TEXT,
  email_lease BIGINT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_order_no_unique ON payment_orders (order_no);
CREATE UNIQUE INDEX IF NOT EXISTS payment_token_unique ON payment_orders (token);
CREATE UNIQUE INDEX IF NOT EXISTS payment_request_unique ON payment_orders (request_id);
CREATE UNIQUE INDEX IF NOT EXISTS payment_provider_trade_unique ON payment_orders (provider_trade_no);
CREATE TABLE IF NOT EXISTS payment_rate_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL
);
