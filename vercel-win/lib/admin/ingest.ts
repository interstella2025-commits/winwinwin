import crypto from 'crypto';
import { db } from '../payuni/db';
import { ensureAnalyticsTables } from './schema';

const EVENT_NAMES = new Set([
  'page_view',
  'cta_click',
  'form_start',
  'form_submit',
  'form_submit_ok',
  'payment_start',
  'registered',
  'session_end',
  'scroll_depth',
  'payment_return',
  'contact_click',
  'dwell_ping',
]);
const OFFERS = new Set(['online', 'inperson', 'notify', 'unknown']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const INGEST_LIMIT = 60;

const IGNORED_UA = /bot|crawler|crawl|spider|slurp|headless|HeadlessChrome|playwright|puppeteer|lighthouse|wget|curl\/|python-requests|Go-http-client|axios\/|facebookexternalhit|preview\//i;

export function isIgnoredAnalyticsUa(userAgent: string) {
  return IGNORED_UA.test(userAgent);
}

export type ParsedEvent = {
  name: string;
  offer: string | null;
  sectionId: string | null;
  data: Record<string, string | number>;
  occurredAt: string;
  pagePath: string;
};

export type ParsedIngest = {
  visitorId: string;
  sessionId: string;
  startedAt: string;
  lastSeenAt: string;
  landingPath: string;
  landingUrl: string;
  referrer: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  viewportWidth: number;
  utm: {
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  maxScrollDepth: number;
  lastStage: string;
  events: ParsedEvent[];
};

export type IngestFailure = { ok: false; status: number; error: string };
export type IngestSuccess = { ok: true; value: ParsedIngest };

function cleanToken(value: unknown, max = 120) {
  if (typeof value !== 'string') return null;
  const text = value.trim().slice(0, max);
  if (!text || text.includes('@') || /[\u0000-\u001f]/.test(text)) return null;
  return text;
}

function iso(value: unknown, now: number) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  if (time > now + 5 * 60 * 1000) return null;
  if (time < now - 2 * 24 * 60 * 60 * 1000) return null;
  return new Date(time).toISOString();
}

export function readLanding(raw: unknown) {
  if (typeof raw !== 'string') return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.pathname === '/admin' || url.pathname.startsWith('/admin/')) return null;
  const utm = {
    utm_source: cleanToken(url.searchParams.get('utm_source')),
    utm_medium: cleanToken(url.searchParams.get('utm_medium')),
    utm_campaign: cleanToken(url.searchParams.get('utm_campaign')),
    utm_content: cleanToken(url.searchParams.get('utm_content')),
    utm_term: cleanToken(url.searchParams.get('utm_term')),
  };
  const landing = new URL(`${url.origin}${url.pathname}`);
  for (const [key, value] of Object.entries(utm)) if (value) landing.searchParams.set(key, value);
  return { path: (url.pathname || '/').slice(0, 300), url: landing.toString().slice(0, 2048), utm };
}

export function readReferrer(raw: unknown) {
  if (typeof raw !== 'string' || !raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin.slice(0, 200);
  } catch {
    return null;
  }
}

export function deviceType(userAgent: string, viewportWidth: number): ParsedIngest['deviceType'] {
  if (/ipad|tablet/i.test(userAgent) || (viewportWidth >= 640 && viewportWidth < 1024)) return 'tablet';
  if (/mobile|iphone|android/i.test(userAgent) || viewportWidth < 640) return 'mobile';
  if (viewportWidth >= 1024) return 'desktop';
  return 'unknown';
}

function pagePath(raw: unknown, fallback: string) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  const path = raw.split('?')[0].slice(0, 300);
  if (path === '/admin' || path.startsWith('/admin/')) return null;
  return path;
}

function eventData(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data: Record<string, string | number> = {};
  const source = raw as Record<string, unknown>;
  if (typeof source.depth === 'number' && source.depth >= 0 && source.depth <= 100) data.depth = Math.round(source.depth);
  if (typeof source.durationSeconds === 'number' && source.durationSeconds >= 0 && source.durationSeconds <= 86400) data.durationSeconds = Math.round(source.durationSeconds);
  if (source.method === 'line' || source.method === 'phone') data.method = source.method;
  return data;
}

export function parseIngest(raw: string, userAgent: string, now = Date.now()): IngestSuccess | IngestFailure {
  if (raw.length > 20000) return { ok: false, status: 413, error: 'Payload too large' };
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, status: 400, error: 'Invalid payload' };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, status: 400, error: 'Invalid payload' };
  const input = body as Record<string, unknown>;
  if (typeof input.visitorId !== 'string' || !UUID.test(input.visitorId)) return { ok: false, status: 400, error: 'Invalid payload' };
  if (typeof input.sessionId !== 'string' || !UUID.test(input.sessionId)) return { ok: false, status: 400, error: 'Invalid payload' };
  const startedAt = iso(input.startedAt, now);
  const landing = readLanding(input.landingUrl);
  if (!startedAt || !landing) return { ok: false, status: 400, error: 'Invalid payload' };
  const width = input.viewportWidth;
  if (typeof width !== 'number' || !Number.isInteger(width) || width < 0 || width > 10000) return { ok: false, status: 400, error: 'Invalid payload' };
  if (!Array.isArray(input.events) || input.events.length < 1 || input.events.length > 20) return { ok: false, status: 400, error: 'Invalid payload' };
  const events: ParsedEvent[] = [];
  for (const item of input.events) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return { ok: false, status: 400, error: 'Invalid payload' };
    const event = item as Record<string, unknown>;
    if (typeof event.name !== 'string' || !EVENT_NAMES.has(event.name)) return { ok: false, status: 400, error: 'Invalid payload' };
    const occurredAt = iso(event.occurredAt, now);
    const path = pagePath(event.pagePath, landing.path);
    if (!occurredAt || !path) return { ok: false, status: 400, error: 'Invalid payload' };
    const offer = typeof event.offer === 'string' && OFFERS.has(event.offer) ? event.offer : null;
    const sectionId = typeof event.sectionId === 'string' && /^[a-z0-9_-]{1,40}$/.test(event.sectionId) ? event.sectionId : null;
    events.push({ name: event.name, offer, sectionId, data: eventData(event.data), occurredAt, pagePath: path });
  }
  const lastSeenAt = events.reduce((max, event) => event.occurredAt > max ? event.occurredAt : max, startedAt);
  const last = events.reduce((chosen, event) => event.occurredAt >= chosen.occurredAt ? event : chosen, events[0]);
  const maxScrollDepth = events.reduce((max, event) => typeof event.data.depth === 'number' ? Math.max(max, event.data.depth) : max, 0);
  return {
    ok: true,
    value: {
      visitorId: input.visitorId.toLowerCase(),
      sessionId: input.sessionId.toLowerCase(),
      startedAt,
      lastSeenAt,
      landingPath: landing.path,
      landingUrl: landing.url,
      referrer: readReferrer(input.referrer),
      deviceType: deviceType(userAgent, width),
      viewportWidth: width,
      utm: landing.utm,
      maxScrollDepth,
      lastStage: last.name,
      events,
    },
  };
}

export function hashIp(request: Request) {
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const secret = process.env.ANALYTICS_HASH_SECRET || 'win-site-analytics';
  return crypto.createHmac('sha256', secret).update(ip).digest('hex');
}

export async function recordIngest(value: ParsedIngest, ipHash: string, now = Date.now()) {
  await ensureAnalyticsTables();
  const bucket = `${ipHash.slice(0, 16)}:${Math.floor(now / 60000)}`;
  const rate = await db().query(
    'INSERT INTO site_ingest_limits (bucket, attempts) VALUES ($1, 1) ON CONFLICT(bucket) DO UPDATE SET attempts = site_ingest_limits.attempts + 1 RETURNING attempts',
    [bucket],
  );
  const attempts = Number((rate[0] as { attempts?: unknown } | undefined)?.attempts || 0);
  if (attempts > INGEST_LIMIT) return { ok: false as const, status: 429, error: 'Too many requests' };
  const visitorKey = `${ipHash.slice(0, 8).toUpperCase()}-${value.visitorId.slice(0, 6).toUpperCase()}`;
  const createdAt = new Date(now).toISOString();
  await db().transaction([
    {
      text: `INSERT INTO site_sessions (
        id, visitor_id, visitor_key, ip_hash, started_at, last_seen_at, landing_path, landing_url, last_page_path,
        referrer, device_type, viewport_width, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        max_scroll_depth, last_stage, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT(id) DO UPDATE SET
        last_seen_at = CASE WHEN excluded.last_seen_at > site_sessions.last_seen_at THEN excluded.last_seen_at ELSE site_sessions.last_seen_at END,
        last_page_path = CASE WHEN excluded.last_seen_at >= site_sessions.last_seen_at THEN excluded.last_page_path ELSE site_sessions.last_page_path END,
        last_stage = CASE WHEN excluded.last_seen_at >= site_sessions.last_seen_at THEN excluded.last_stage ELSE site_sessions.last_stage END,
        max_scroll_depth = CASE WHEN excluded.max_scroll_depth > site_sessions.max_scroll_depth THEN excluded.max_scroll_depth ELSE site_sessions.max_scroll_depth END,
        referrer = COALESCE(site_sessions.referrer, excluded.referrer),
        utm_source = COALESCE(site_sessions.utm_source, excluded.utm_source),
        utm_medium = COALESCE(site_sessions.utm_medium, excluded.utm_medium),
        utm_campaign = COALESCE(site_sessions.utm_campaign, excluded.utm_campaign),
        utm_content = COALESCE(site_sessions.utm_content, excluded.utm_content),
        utm_term = COALESCE(site_sessions.utm_term, excluded.utm_term)`,
      params: [
        value.sessionId, value.visitorId, visitorKey, ipHash, value.startedAt, value.lastSeenAt, value.landingPath, value.landingUrl, value.events.at(-1)?.pagePath || value.landingPath,
        value.referrer, value.deviceType, value.viewportWidth, value.utm.utm_source, value.utm.utm_medium, value.utm.utm_campaign, value.utm.utm_content, value.utm.utm_term,
        value.maxScrollDepth, value.lastStage, createdAt,
      ],
    },
    ...value.events.map(event => ({
      text: 'INSERT INTO site_events (id, session_id, visitor_id, event_name, page_path, section_id, offer, event_data, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      params: [crypto.randomUUID(), value.sessionId, value.visitorId, event.name, event.pagePath, event.sectionId, event.offer, JSON.stringify(event.data), event.occurredAt],
    })),
  ]);
  return { ok: true as const };
}
