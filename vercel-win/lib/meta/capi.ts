import { createHash } from 'node:crypto';
import { PUBLIC_ORIGIN } from '../payuni/core';
import { db, first } from '../payuni/db';

/** Graph version still inside the Conversions API two-year support window. */
const GRAPH_VERSION = 'v25.0';
const CONTENT_NAME = 'WIN講師班 90分鐘線上前導課';
const APPLY_URL = `${PUBLIC_ORIGIN}/#apply`;
const PAYMENT_URL = `${PUBLIC_ORIGIN}/payment`;
const EVENT_ID = /^[A-Za-z0-9:_-]{8,80}$/;

type EventName = 'Lead' | 'InitiateCheckout' | 'Purchase';
type Attribution = { ip?: string; userAgent?: string; fbp?: string; fbc?: string };
type CustomData = Record<string, string | number>;
type Outbound = {
 name: EventName;
 eventId: string;
 sourceUrl: string;
 email?: string;
 phone?: string;
 attribution: Attribution;
 customData: CustomData;
};

const seen = new Set<string>();
let ready: Promise<void> | undefined;

/** Client-supplied browser event id. Invalid values are ignored so we never invent a non-matching id. */
export function metaEventId(value: unknown): string | undefined {
 return typeof value === 'string' && EVENT_ID.test(value) ? value : undefined;
}

export function hashEmail(email: string): string | undefined {
 const normalized = email.trim().toLowerCase();
 if (!normalized || !normalized.includes('@')) return;
 return sha256(normalized);
}

/** Taiwan mobile 09xxxxxxxx → 8869xxxxxxxx, then SHA-256. */
export function hashPhone(phone: string): string | undefined {
 let digits = phone.replace(/\D/g, '');
 if (!digits) return;
 if (digits.startsWith('886')) digits = '886' + digits.slice(3).replace(/^0+/, '');
 else {
  digits = digits.replace(/^0+/, '');
  if (/^9\d{8}$/.test(digits)) digits = '886' + digits;
 }
 if (digits.length < 8) return;
 return sha256(digits);
}

function sha256(value: string) {
 return createHash('sha256').update(value).digest('hex');
}

function configured() {
 const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
 const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
 return Boolean(pixel && token && /^\d{5,20}$/.test(pixel));
}

function pixelId() {
 return process.env.NEXT_PUBLIC_META_PIXEL_ID!.trim();
}

function accessToken() {
 return process.env.META_CAPI_ACCESS_TOKEN!.trim();
}

/** Lead (and InitiateCheckout when a checkout id is present). No-ops without Pixel id or token. */
export async function sendRegistrationEvents(request: Request, input: {
 email: string;
 phone: string;
 leadEventId?: string;
 checkoutEventId?: string;
 value: number;
 orderNo?: string;
}) {
 try {
  if (!configured()) return;
  const attribution = attributionFrom(request);
  if (input.orderNo) await rememberAttribution(input.orderNo, attribution);
  const events: Outbound[] = [];
  if (input.leadEventId) events.push({
   name: 'Lead', eventId: input.leadEventId, sourceUrl: APPLY_URL, email: input.email, phone: input.phone, attribution,
   customData: { content_name: CONTENT_NAME, value: input.value, currency: 'TWD' },
  });
  if (input.checkoutEventId) events.push({
   name: 'InitiateCheckout', eventId: input.checkoutEventId, sourceUrl: APPLY_URL, email: input.email, phone: input.phone, attribution,
   customData: { value: input.value, currency: 'TWD' },
  });
  await deliver(events);
 } catch { /* registration must succeed even if CAPI is down */ }
}

/**
 * Purchase for a real paid order. NT$1 / win-test-1 orders are skipped. Never throws.
 * `firstTransition` is true only when this notify is the one that marked the order paid.
 * A later notify does not send another Purchase unless that attempt failed.
 */
export async function sendPurchaseEvent(order: { order_no: string; amount: number; source: string; application_id: string }, firstTransition: boolean) {
 try {
  if (order.source === 'win-test-1' || order.amount === 1) return;
  if (!configured() || !metaEventId(order.order_no)) return;
  const key = `Purchase:${order.order_no}`;
  if (!await claimPurchase(key, firstTransition)) return;
  try {
   const person = await first<{ email: string; phone: string }>('SELECT email,phone FROM applications WHERE id=$1', [order.application_id]);
   const attribution = await loadAttribution(order.order_no);
   await post([{
    name: 'Purchase', eventId: order.order_no, sourceUrl: PAYMENT_URL, email: person?.email, phone: person?.phone, attribution,
    customData: { currency: 'TWD', value: order.amount, order_id: order.order_no, content_name: CONTENT_NAME },
   }]);
   await markPurchase(key, 'sent');
  } catch { await markPurchase(key, 'failed'); }
 } catch { /* notify must succeed even if CAPI is down */ }
}

async function deliver(events: Outbound[]) {
 const batch: Outbound[] = [];
 const owned: string[] = [];
 const ephemeral: string[] = [];
 for (const event of events) {
  if (!metaEventId(event.eventId)) continue;
  const key = `${event.name}:${event.eventId}`;
  const claim = await take(key, event.name);
  if (claim === 'skip') continue;
  batch.push(event);
  if (claim === 'owned') owned.push(key);
  else ephemeral.push(key);
 }
 if (!batch.length) return;
 try {
  await post(batch);
 } catch {
  for (const key of ephemeral) seen.delete(key);
  await Promise.all(owned.map(key => release(key)));
 }
}

/** 'owned' is durable; 'ephemeral' is process-local when the claim table is unavailable. */
async function take(key: string, name: string): Promise<'owned' | 'ephemeral' | 'skip'> {
 try {
  await ensure();
  const rows = await db().query(
   'INSERT INTO capi_events (event_key,event_name,sent_at) VALUES ($1,$2,$3) ON CONFLICT(event_key) DO NOTHING RETURNING event_key',
   [key, name, new Date().toISOString()],
  );
  return rows.length > 0 ? 'owned' : 'skip';
 } catch {
  if (seen.has(key)) return 'skip';
  seen.add(key);
  return 'ephemeral';
 }
}

async function release(key: string) {
 try {
  await db().query('DELETE FROM capi_events WHERE event_key=$1', [key]);
 } catch { /* a later notify can still be deduped by Meta event_id */ }
}

/** Purchase is claimed separately so an already-paid order is never backfilled. */
async function claimPurchase(key: string, firstTransition: boolean) {
 try {
  await ensure();
  if (firstTransition) {
   const rows = await db().query(
    `INSERT INTO capi_events (event_key,event_name,sent_at,detail) VALUES ($1,'Purchase',$2,'pending') ON CONFLICT(event_key) DO NOTHING RETURNING event_key`,
    [key, new Date().toISOString()],
   );
   return rows.length > 0;
  }
  const now = new Date().toISOString();
  const stale = new Date(Date.now() - 15_000).toISOString();
  const rows = await db().query(
   `UPDATE capi_events SET detail='pending', sent_at=$2 WHERE event_key=$1 AND event_name='Purchase' AND (detail='failed' OR (detail='pending' AND sent_at < $3)) RETURNING event_key`,
   [key, now, stale],
  );
  return rows.length > 0;
 } catch {
  if (!firstTransition || seen.has(key)) return false;
  seen.add(key);
  return true;
 }
}

async function markPurchase(key: string, detail: 'sent' | 'failed') {
 try {
  const rows = await db().query('UPDATE capi_events SET detail=$2, sent_at=$3 WHERE event_key=$1 RETURNING event_key', [key, detail, new Date().toISOString()]);
  if (rows.length > 0) return;
 } catch { /* claim table unavailable; fall through to the process-local guard */ }
 if (detail === 'failed') seen.delete(key);
}

function ensure() {
 if (!ready) {
  ready = db().query(`CREATE TABLE IF NOT EXISTS capi_events (
   event_key TEXT PRIMARY KEY,
   event_name TEXT NOT NULL,
   sent_at TEXT NOT NULL,
   detail TEXT
  )`).then(() => undefined, error => { ready = undefined; throw error; });
 }
 return ready;
}

async function rememberAttribution(orderNo: string, attribution: Attribution) {
 if (!orderNo || !Object.keys(attribution).length) return;
 try {
  await ensure();
  await db().query(
   `INSERT INTO capi_events (event_key,event_name,sent_at,detail) VALUES ($1,'context',$2,$3)
    ON CONFLICT(event_key) DO UPDATE SET detail=excluded.detail, sent_at=excluded.sent_at`,
   [`ctx:${orderNo}`, new Date().toISOString(), JSON.stringify(attribution)],
  );
 } catch { /* Purchase can still be sent with hashed email and phone */ }
}

async function loadAttribution(orderNo: string): Promise<Attribution> {
 try {
  await ensure();
  const rows = await db().query('SELECT detail FROM capi_events WHERE event_key=$1', [`ctx:${orderNo}`]);
  const detail = rows[0]?.detail;
  if (typeof detail !== 'string' || !detail) return {};
  return cleanAttribution(JSON.parse(detail));
 } catch { return {}; }
}

function attributionFrom(request: Request): Attribution {
 const headerIp = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
 const ip = headerIp && headerIp !== 'unknown' && headerIp.length <= 64 ? headerIp : undefined;
 const agent = request.headers.get('user-agent')?.trim();
 const userAgent = agent && agent.length <= 512 ? agent : undefined;
 const fbp = cookie(request, '_fbp');
 const fbc = cookie(request, '_fbc');
 return cleanAttribution({ ip, userAgent, fbp, fbc });
}

function cleanAttribution(value: unknown): Attribution {
 if (!value || typeof value !== 'object') return {};
 const row = value as Record<string, unknown>;
 const out: Attribution = {};
 if (typeof row.ip === 'string' && row.ip.length > 0 && row.ip.length <= 64 && row.ip !== 'unknown') out.ip = row.ip;
 if (typeof row.userAgent === 'string' && row.userAgent.length > 0 && row.userAgent.length <= 512) out.userAgent = row.userAgent;
 if (typeof row.fbp === 'string' && /^fb\.1\.\d{10,13}\.[A-Za-z0-9]{1,40}$/.test(row.fbp)) out.fbp = row.fbp;
 if (typeof row.fbc === 'string' && /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,128}$/.test(row.fbc)) out.fbc = row.fbc;
 return out;
}

function cookie(request: Request, name: '_fbp' | '_fbc') {
 const header = request.headers.get('cookie');
 if (!header) return;
 for (const part of header.split(';')) {
  const eq = part.indexOf('=');
  if (eq < 0) continue;
  if (part.slice(0, eq).trim() !== name) continue;
  try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch { return; }
 }
}

async function post(events: Outbound[]) {
 const pixel = pixelId();
 const token = accessToken();
 // Token stays in the query string, matching the Conversions API contract. Never log this URL.
 const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: events.map(toPayload) }),
  signal: AbortSignal.timeout(5000),
 });
 if (!response.ok) {
  await response.arrayBuffer().catch(() => undefined);
  throw new Error('Meta CAPI request failed');
 }
 await response.arrayBuffer().catch(() => undefined);
}

function toPayload(event: Outbound) {
 const user_data: Record<string, string | string[]> = {};
 const em = event.email ? hashEmail(event.email) : undefined;
 const ph = event.phone ? hashPhone(event.phone) : undefined;
 if (em) user_data.em = [em];
 if (ph) user_data.ph = [ph];
 if (event.attribution.ip) user_data.client_ip_address = event.attribution.ip;
 if (event.attribution.userAgent) user_data.client_user_agent = event.attribution.userAgent;
 if (event.attribution.fbp) user_data.fbp = event.attribution.fbp;
 if (event.attribution.fbc) user_data.fbc = event.attribution.fbc;
 return {
  event_name: event.name,
  event_time: Math.floor(Date.now() / 1000),
  event_id: event.eventId,
  action_source: 'website' as const,
  event_source_url: event.sourceUrl,
  user_data,
  custom_data: event.customData,
 };
}
