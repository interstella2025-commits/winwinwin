-- Registration source attribution (first touch / UTM / fbclid presence).
-- Additive only: nullable TEXT columns, no defaults, no data rewrites, no deletes.
-- Existing rows keep NULL. The production deployment also runs these statements lazily
-- (lib/admin/attribution.ts, ensureAttributionColumns); previews never do.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_source TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_medium TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_campaign TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_referrer TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_landing_path TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_first_seen_at TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_last_source TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS attribution_has_fbclid TEXT;
