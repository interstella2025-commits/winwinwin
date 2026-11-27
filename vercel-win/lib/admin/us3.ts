import { db } from '../payuni/db';
import { formatTaipeiRange } from './report';
import { isExcludedTestName } from './test-registrations';

export const US3_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS us3_events (
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
)`,
  'CREATE INDEX IF NOT EXISTS us3_events_occurred_idx ON us3_events (occurred_at)',
  'CREATE INDEX IF NOT EXISTS us3_events_kind_idx ON us3_events (kind, occurred_at)',
];

const SESSION_DATES: Record<string, string> = {
  '2026/12/16（三）14:00–16:00': '2026-12-16',
  '2026/12/23（三）14:00–16:00': '2026-12-23',
  '2026/12/30（三）14:00–16:00': '2026-12-30',
  '2026-12-16': '2026-12-16',
  '2026-12-23': '2026-12-23',
  '2026-12-30': '2026-12-30',
};

const KINDS = new Set(['page_view', 'seminar_signup', 'lead']);

let ready: Promise<void> | undefined;

export function ensureUs3Tables() {
  if (!ready) {
    ready = (async () => {
      for (const statement of US3_SCHEMA) await db().query(statement);
    })().catch(error => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

export function us3AllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    const host = url.hostname;
    const local = host === 'localhost' || host === '127.0.0.1';
    if (local && (url.protocol === 'http:' || url.protocol === 'https:')) return origin;
    if (url.protocol !== 'https:') return null;
    if (host === 'us2027.waward.group' || host === '2027us.waward.group' || host === 'us3top-e.vercel.app') return origin;
    if (/^us3top[\w.-]*\.vercel\.app$/.test(host)) return origin;
    return null;
  } catch {
    return null;
  }
}

export function us3RangeDays(value: string | undefined) {
  return value === '1' ? 1 : value === '7' ? 7 : 30;
}

function clip(value: unknown, max: number) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
}

function pagePath(value: unknown) {
  const raw = clip(value, 180);
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/';
  return raw.split('?')[0] || '/';
}

function referrerHost(value: unknown) {
  const raw = clip(value, 300);
  if (!raw) return null;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase();
    return host ? host.slice(0, 120) : null;
  } catch {
    return null;
  }
}

function visitorId(value: unknown) {
  const raw = clip(value, 80);
  return /^[A-Za-z0-9_-]{8,80}$/.test(raw) ? raw : null;
}

function requestId(value: unknown) {
  const raw = clip(value, 80);
  if (/^[A-Za-z0-9_-]{8,80}$/.test(raw)) return raw;
  return `us3-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ParsedUs3Event = {
  id: string;
  kind: 'page_view' | 'seminar_signup' | 'lead';
  pagePath: string;
  sessionDate: string | null;
  source: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  visitorId: string | null;
  referrerHost: string | null;
  personName: string | null;
  isTest: number;
};

export function parseUs3Event(raw: string): { ok: true; value: ParsedUs3Event } | { ok: false; status: number; error: string } {
  if (raw.length > 8000) return { ok: false, status: 400, error: '請重新送出。' };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: '請重新送出。' };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: '請重新送出。' };
  const record = body as Record<string, unknown>;
  const kind = clip(record.kind, 40);
  if (!KINDS.has(kind)) return { ok: false, status: 400, error: '無法辨識這筆資料。' };
  const typedKind = kind as ParsedUs3Event['kind'];
  const sessionRaw = clip(record.session || record.sessionDate, 80);
  const sessionDate = typedKind === 'seminar_signup' ? (SESSION_DATES[sessionRaw] || null) : null;
  if (typedKind === 'seminar_signup' && !sessionDate) return { ok: false, status: 400, error: '請選擇一場說明會。' };
  const name = typedKind === 'page_view' ? '' : clip(record.name, 80);
  if (typedKind !== 'page_view' && !name) return { ok: false, status: 400, error: '請填寫姓名。' };
  const optional = (value: unknown, max: number) => {
    const text = clip(value, max);
    return text || null;
  };
  return {
    ok: true,
    value: {
      id: requestId(record.requestId),
      kind: typedKind,
      pagePath: pagePath(record.pagePath),
      sessionDate,
      source: optional(record.source, 180),
      utmSource: optional(record.utm_source, 120),
      utmMedium: optional(record.utm_medium, 120),
      utmCampaign: optional(record.utm_campaign, 120),
      utmContent: optional(record.utm_content, 120),
      utmTerm: optional(record.utm_term, 120),
      visitorId: visitorId(record.visitorId),
      referrerHost: referrerHost(record.referrer),
      personName: name || null,
      isTest: typedKind !== 'page_view' && isExcludedTestName(name) ? 1 : 0,
    },
  };
}

export async function recordUs3Event(value: ParsedUs3Event, occurredAt = new Date().toISOString()) {
  await ensureUs3Tables();
  await db().query(
    `INSERT INTO us3_events (
      id, kind, occurred_at, page_path, session_date, source,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      visitor_id, referrer_host, person_name, is_test
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    ON CONFLICT (id) DO NOTHING`,
    [
      value.id, value.kind, occurredAt, value.pagePath, value.sessionDate, value.source,
      value.utmSource, value.utmMedium, value.utmCampaign, value.utmContent, value.utmTerm,
      value.visitorId, value.referrerHost, value.personName, value.isTest,
    ],
  );
  return { ok: true as const };
}

export type Us3EventRow = {
  kind: string;
  occurred_at: string;
  page_path: string;
  session_date: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  visitor_id: string | null;
  referrer_host: string | null;
  is_test: number | boolean | string;
};

export type Us3Report = {
  days: number;
  periodCaption: string;
  unavailable: boolean;
  capped: boolean;
  excludedTests: number;
  trackingStartedAt: string | null;
  kpis: {
    visits: number;
    visitors: number;
    seminarSignups: number;
    leads: number;
    seminar1216: number;
    seminar1223: number;
    seminar1230: number;
    seminarUndated: number;
  };
  funnel: { seminarPage: number; webinarPage: number; cambridgePage: number };
  trend: { label: string; visits: number; formStarts: number; completions: number }[];
  pages: { label: string; value: number }[];
  sources: { label: string; value: number }[];
  signupSources: { label: string; value: number }[];
  sessions: { label: string; value: number }[];
  dailySignups: { label: string; visits: number; signups: number; leads: number }[];
};

function taipeiDate(value: string | number) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function shiftDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function dayLabel(isoDate: string) {
  const [, month, day] = isoDate.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function isTest(row: Us3EventRow) {
  return Number(row.is_test) === 1;
}

function pageGroup(path: string) {
  const clean = (path || '/').split('?')[0];
  if (clean === '/' || clean === '/index.html') return '首頁';
  if (clean.startsWith('/seminar') || clean.startsWith('/en/seminar')) return '實體說明會';
  if (clean.startsWith('/webinar') || clean.startsWith('/en/webinar')) return '線上說明會';
  if (clean.startsWith('/cambridge')) return '劍橋頁';
  if (clean === '/en' || clean === '/en/' || clean.startsWith('/en/')) return '英文首頁';
  return '其他';
}

function sourceLabel(row: Us3EventRow) {
  if (row.utm_source) {
    const parts = [row.utm_source, row.utm_medium].filter(Boolean).join(' / ');
    return row.utm_campaign ? `${parts}｜${row.utm_campaign}` : parts;
  }
  if (row.source) return row.source;
  return row.referrer_host || '直接進站';
}

function uniqueVisitors(rows: Us3EventRow[]) {
  const ids = new Set<string>();
  let anonymous = 0;
  for (const row of rows) {
    if (row.kind !== 'page_view') continue;
    if (row.visitor_id) ids.add(row.visitor_id);
    else anonymous += 1;
  }
  return ids.size + anonymous;
}

function grouped(rows: Us3EventRow[], labelOf: (row: Us3EventRow) => string) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const label = labelOf(row);
    map.set(label, (map.get(label) || 0) + 1);
  }
  return [...map.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'zh-Hant'));
}

export function buildUs3Report(input: { days: number; since: string; now?: number; rows: Us3EventRow[]; unavailable?: boolean; capped?: boolean }): Us3Report {
  const now = input.now ?? Date.now();
  const visible = input.rows.filter(row => !isTest(row));
  const excludedTests = input.rows.filter(row => isTest(row) && (row.kind === 'seminar_signup' || row.kind === 'lead')).length;
  const visits = visible.filter(row => row.kind === 'page_view');
  const signups = visible.filter(row => row.kind === 'seminar_signup');
  const leads = visible.filter(row => row.kind === 'lead');
  const start = taipeiDate(input.since);
  const end = taipeiDate(now);
  const trend: Us3Report['trend'] = [];
  const dailySignups: Us3Report['dailySignups'] = [];
  for (let cursor = start; cursor <= end; cursor = shiftDate(cursor, 1)) {
    const dayVisits = visits.filter(row => taipeiDate(row.occurred_at) === cursor).length;
    const daySignups = signups.filter(row => taipeiDate(row.occurred_at) === cursor).length;
    const dayLeads = leads.filter(row => taipeiDate(row.occurred_at) === cursor).length;
    trend.push({ label: dayLabel(cursor), visits: dayVisits, formStarts: dayLeads, completions: daySignups });
    if (daySignups || dayLeads) dailySignups.push({ label: dayLabel(cursor), visits: dayVisits, signups: daySignups, leads: dayLeads });
    if (cursor === end) break;
  }
  const started = input.rows.map(row => row.occurred_at).sort()[0] || null;
  return {
    days: input.days,
    periodCaption: formatTaipeiRange(input.since, now),
    unavailable: Boolean(input.unavailable),
    capped: Boolean(input.capped),
    excludedTests,
    trackingStartedAt: started && started > input.since ? started : null,
    kpis: {
      visits: visits.length,
      visitors: uniqueVisitors(visible),
      seminarSignups: signups.length,
      leads: leads.length,
      seminar1216: signups.filter(row => row.session_date === '2026-12-16').length,
      seminar1223: signups.filter(row => row.session_date === '2026-12-23').length,
      seminar1230: signups.filter(row => row.session_date === '2026-12-30').length,
      seminarUndated: signups.filter(row => !row.session_date).length,
    },
    funnel: {
      seminarPage: visits.filter(row => pageGroup(row.page_path) === '實體說明會').length,
      webinarPage: visits.filter(row => pageGroup(row.page_path) === '線上說明會').length,
      cambridgePage: visits.filter(row => pageGroup(row.page_path) === '劍橋頁').length,
    },
    trend,
    pages: grouped(visits, row => pageGroup(row.page_path)),
    sources: grouped(visits, sourceLabel),
    signupSources: grouped(signups, sourceLabel),
    sessions: [
      { label: '12/16（三）14:00', value: signups.filter(row => row.session_date === '2026-12-16').length },
      { label: '12/23（三）14:00', value: signups.filter(row => row.session_date === '2026-12-23').length },
      { label: '12/30（三）14:00', value: signups.filter(row => row.session_date === '2026-12-30').length },
    ],
    dailySignups,
  };
}

function emptyUs3Report(days: number, since: string, unavailable: boolean): Us3Report {
  return buildUs3Report({ days, since, rows: [], unavailable });
}

export async function loadUs3Report(days: number, now = Date.now()): Promise<Us3Report> {
  const since = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  try {
    await ensureUs3Tables();
    const rows = await db().query(
      `SELECT kind, occurred_at, page_path, session_date, source, utm_source, utm_medium, utm_campaign, visitor_id, referrer_host, is_test
       FROM us3_events
       WHERE occurred_at >= $1
       ORDER BY occurred_at ASC
       LIMIT 20001`,
      [since],
    );
    const capped = rows.length > 20000;
    return buildUs3Report({ days, since, now, rows: (capped ? rows.slice(0, 20000) : rows) as Us3EventRow[], capped });
  } catch {
    console.error('us3 report unavailable');
    return emptyUs3Report(days, since, true);
  }
}
