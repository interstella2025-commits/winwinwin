-- Free online (直播) signups. No payment order. Created at runtime as well
-- (CREATE TABLE IF NOT EXISTS) so a new signup works before this file is applied by hand.
CREATE TABLE IF NOT EXISTS online_signups (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  application_id TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_id TEXT,
  email_lease BIGINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
