-- Additive first-party traffic tables for the WIN lecturer admin dashboard.
-- Apply once on Neon. This file only creates new tables and indexes.
-- It does not modify earlier migrations.

CREATE TABLE IF NOT EXISTS site_sessions (
  id TEXT PRIMARY KEY,
  visitor_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  started_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  landing_path TEXT NOT NULL,
  landing_url TEXT NOT NULL,
  last_page_path TEXT NOT NULL,
  referrer TEXT,
  device_type TEXT NOT NULL,
  viewport_width INTEGER,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  max_scroll_depth INTEGER NOT NULL DEFAULT 0,
  last_stage TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES site_sessions (id),
  visitor_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  page_path TEXT NOT NULL,
  section_id TEXT,
  offer TEXT,
  event_data TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_ingest_limits (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS site_sessions_started_idx ON site_sessions (started_at);
CREATE INDEX IF NOT EXISTS site_events_session_idx ON site_events (session_id, occurred_at);
CREATE INDEX IF NOT EXISTS site_events_name_idx ON site_events (event_name, occurred_at);
