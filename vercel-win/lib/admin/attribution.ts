import { db } from '../payuni/db';
import { sourceLabel } from './source-label';

/**
 * Registration source columns on `applications`. All nullable, added with
 * ADD COLUMN only; existing rows stay NULL. See db/migrations/0004_registration_attribution.sql.
 */
export const ATTRIBUTION_COLUMNS = [
  'attribution_source',
  'attribution_medium',
  'attribution_campaign',
  'attribution_referrer',
  'attribution_landing_path',
  'attribution_first_seen_at',
  'attribution_last_source',
  'attribution_has_fbclid',
] as const;

export const ATTRIBUTION_MIGRATION = ATTRIBUTION_COLUMNS.map(column => `ALTER TABLE applications ADD COLUMN IF NOT EXISTS ${column} TEXT`);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The columns are created automatically only on the production deployment (or when
 * ATTRIBUTION_AUTO_MIGRATE=1, used by tests). Previews share the production database,
 * so they never alter the schema; they just skip writing until the columns exist.
 */
export function attributionAutoMigrate(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL_ENV === 'production' || env.ATTRIBUTION_AUTO_MIGRATE === '1';
}

let ready: Promise<boolean> | undefined;

export function ensureAttributionColumns(env: NodeJS.ProcessEnv = process.env): Promise<boolean> {
  if (!attributionAutoMigrate(env)) return Promise.resolve(false);
  if (!ready) {
    ready = (async () => {
      for (const statement of ATTRIBUTION_MIGRATION) await db().query(statement);
      return true;
    })().catch(() => { ready = undefined; return false; });
  }
  return ready;
}

type SessionSource = {
  started_at: string;
  referrer: string | null;
  landing_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export type RegistrationAttribution = Record<(typeof ATTRIBUTION_COLUMNS)[number], string | null>;

function hostOf(referrer: string | null) {
  if (!referrer) return null;
  try { return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase(); } catch { return null; }
}

/** Build the stored values from the visitor's first visit, the current visit and whether an fbclid was seen. */
export function buildAttribution(first: SessionSource | null, current: SessionSource | null, hasFbclid: boolean): RegistrationAttribution | null {
  if (!first && !current && !hasFbclid) return null;
  const origin = first || current;
  let label = origin ? sourceLabel(origin) : null;
  if (hasFbclid && (!label || label === '直接進站')) label = 'Facebook（廣告點擊）';
  return {
    attribution_source: label,
    attribution_medium: origin?.utm_medium || null,
    attribution_campaign: origin?.utm_campaign || null,
    attribution_referrer: hostOf(origin?.referrer || null),
    attribution_landing_path: origin?.landing_path || null,
    attribution_first_seen_at: origin?.started_at || null,
    attribution_last_source: current ? sourceLabel(current) : null,
    attribution_has_fbclid: hasFbclid ? 'yes' : null,
  };
}

const SESSION_COLUMNS = 'started_at, referrer, landing_path, utm_source, utm_medium, utm_campaign';

/**
 * Best effort: attaches first-touch source data to a new registration. Never throws,
 * so a missing column or analytics table cannot break a signup.
 */
export async function recordRegistrationAttribution(applicationId: string, body: Record<string, unknown>) {
  try {
    if (!(await ensureAttributionColumns())) return;
    const visitorId = typeof body.analyticsVisitorId === 'string' && UUID.test(body.analyticsVisitorId) ? body.analyticsVisitorId.toLowerCase() : null;
    const sessionId = typeof body.analyticsSessionId === 'string' && UUID.test(body.analyticsSessionId) ? body.analyticsSessionId.toLowerCase() : null;
    const hasFbclid = typeof body.fbc === 'string' && body.fbc.length > 0;
    let first: SessionSource | null = null;
    let current: SessionSource | null = null;
    try {
      if (visitorId) {
        const rows = await db().query(`SELECT ${SESSION_COLUMNS} FROM site_sessions WHERE visitor_id=$1 ORDER BY started_at ASC LIMIT 1`, [visitorId]) as SessionSource[];
        first = rows[0] || null;
      }
      if (sessionId) {
        const rows = await db().query(`SELECT ${SESSION_COLUMNS} FROM site_sessions WHERE id=$1`, [sessionId]) as SessionSource[];
        current = rows[0] || null;
      }
    } catch { /* analytics tables missing: keep fbclid only */ }
    const values = buildAttribution(first, current, hasFbclid);
    if (!values) return;
    const assignments = ATTRIBUTION_COLUMNS.map((column, index) => `${column}=$${index + 2}`).join(', ');
    await db().query(
      `UPDATE applications SET ${assignments} WHERE id=$1 AND attribution_source IS NULL AND attribution_first_seen_at IS NULL`,
      [applicationId, ...ATTRIBUTION_COLUMNS.map(column => values[column])],
    );
  } catch { /* attribution is optional */ }
}

/** Read stored sources for the given applications. Returns an empty map when the columns are absent. */
export async function loadAttributionSources(since: string): Promise<Map<string, { source: string | null; campaign: string | null; lastSource: string | null }>> {
  const map = new Map<string, { source: string | null; campaign: string | null; lastSource: string | null }>();
  try {
    const rows = await db().query(
      'SELECT id, attribution_source, attribution_campaign, attribution_last_source FROM applications WHERE created_at >= $1 AND attribution_source IS NOT NULL',
      [since],
    ) as { id: string; attribution_source: string | null; attribution_campaign: string | null; attribution_last_source: string | null }[];
    for (const row of rows) map.set(row.id, { source: row.attribution_source, campaign: row.attribution_campaign, lastSource: row.attribution_last_source });
  } catch { /* columns not migrated yet */ }
  return map;
}
