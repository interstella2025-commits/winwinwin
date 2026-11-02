import { createHash } from 'node:crypto';

/** Browser events we accept. Purchase is intentionally absent. */
export const META_EVENTS = Object.freeze({
  page_view: ['PageView', false],
  video_play: ['VideoPlay', true],
  video_progress: ['VideoProgress', true],
  live_offer_view: ['ViewContent', false],
  checkout_open: ['CheckoutOpened', true],
  checkout_step: ['CheckoutStepViewed', true],
  checkout_validation_error: ['CheckoutValidationError', true],
  line_contact_click: ['Contact', false],
} as const);

const OFFERS = new Set(['product']);
const FIELDS = new Set(['name', 'phone', 'email', 'consent', 'submit']);
const NUMBERS = new Set(['step', 'video_time', 'progress']);

export function hashVisitor(value: string) {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export function pixelId(env: Record<string, string | undefined> = process.env) {
  const value = (env.META_PIXEL_ID || '').trim();
  return /^\d+$/.test(value) ? value : '';
}

function isUuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/** Keep numbers and a few labels. Drop names, emails, phones, and anything else. */
export function customData(data: unknown) {
  const source = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  const result: Record<string, string | number> = {};
  for (const key of NUMBERS) {
    const value = Number(source[key]);
    if (source[key] !== undefined && Number.isFinite(value) && value >= 0 && value <= 100000) result[key] = value;
  }
  if (source.offer === 'product' && OFFERS.has('product')) result.offer = 'product';
  if (typeof source.field === 'string' && FIELDS.has(source.field)) result.field = source.field;
  if (source.source === '/premiere') result.source = '/premiere';
  return result;
}

export async function sendCapi(input: {
  eventName: string;
  eventId: string;
  eventTime?: string;
  path?: string;
  visitorId?: string;
  fbp?: string;
  fbc?: string;
  userAgent?: string;
  data?: unknown;
}, env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch) {
  const id = pixelId(env);
  const token = (env.META_CAPI_ACCESS_TOKEN || '').trim();
  const version = (env.META_GRAPH_API_VERSION || '').trim();
  if (!id || !token || !/^v\d+\.\d+$/.test(version) || !input.eventId) return false;
  const userData: Record<string, string | string[]> = {};
  if (isUuid(input.visitorId)) userData.external_id = [hashVisitor(input.visitorId as string)];
  if (input.fbp && /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,300}$/.test(input.fbp)) userData.fbp = input.fbp;
  if (input.fbc && /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,300}$/.test(input.fbc)) userData.fbc = input.fbc;
  if (input.userAgent && input.userAgent.length <= 500) userData.client_user_agent = input.userAgent;
  if (!Object.keys(userData).length) return false;
  const now = Date.now();
  const parsed = input.eventTime ? Date.parse(input.eventTime) : now;
  const safeTime = Number.isFinite(parsed) && parsed >= now - 6 * 24 * 60 * 60 * 1000 && parsed <= now + 60 * 1000 ? parsed : now;
  const origin = (env.PUBLIC_SITE_URL || 'https://2027course.win-lin.com').replace(/\/$/, '');
  const path = input.path === '/premiere' ? '/premiere' : '/premiere';
  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: Math.floor(safeTime / 1000),
    event_id: input.eventId.slice(0, 100),
    action_source: 'website',
    event_source_url: `${origin}${path}`,
    user_data: userData,
  };
  const safeData = customData(input.data);
  if (Object.keys(safeData).length) event.custom_data = safeData;
  try {
    const response = await fetchImpl(`https://graph.facebook.com/${version}/${id}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: [event], access_token: token }),
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
