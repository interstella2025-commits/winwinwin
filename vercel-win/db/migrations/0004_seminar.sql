-- 說明會模板。只新增兩張表，不改既有任何表。
-- 只有在決定讓說明會資料永久保存（SEMINAR_STORE=postgres）時才需要執行。
CREATE TABLE IF NOT EXISTS seminar_configs (
  slug text PRIMARY KEY,
  config jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS seminar_records (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  kind text NOT NULL,
  data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seminar_records_kind_slug ON seminar_records (kind, slug, created_at);
CREATE INDEX IF NOT EXISTS seminar_records_order_no ON seminar_records ((data->>'orderNo')) WHERE kind = 'order';
