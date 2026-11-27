-- Additive only. Records 美國三校 page views, seminar sign-ups, and lead-popup
-- submissions going forward. Does not read or change lecturer tables.
CREATE TABLE IF NOT EXISTS us3_events (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  page_path TEXT NOT NULL,
  session_date TEXT,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  visitor_id TEXT,
  referrer_host TEXT,
  person_name TEXT,
  is_test INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS us3_events_occurred_idx ON us3_events (occurred_at);

CREATE INDEX IF NOT EXISTS us3_events_kind_idx ON us3_events (kind, occurred_at);
