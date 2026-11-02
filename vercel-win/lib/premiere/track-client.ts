const PIXEL: Record<string, [string, boolean]> = {
  page_view: ['PageView', false],
  video_play: ['VideoPlay', true],
  video_progress: ['VideoProgress', true],
  live_offer_view: ['ViewContent', false],
  checkout_open: ['CheckoutOpened', true],
  checkout_step: ['CheckoutStepViewed', true],
  checkout_validation_error: ['CheckoutValidationError', true],
  line_contact_click: ['Contact', false],
};

const VISITOR_KEY = 'win-premiere-visitor';
const seen = new Set<string>();
let pixelReady = false;
let pixelLoading = false;
const pending: unknown[][] = [];

function uuid() {
  return crypto.randomUUID();
}

function visitorId() {
  let value = localStorage.getItem(VISITOR_KEY);
  if (!value || !/^[0-9a-f-]{36}$/i.test(value)) {
    value = uuid();
    localStorage.setItem(VISITOR_KEY, value);
  }
  return value;
}

function cookie(name: string) {
  return document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || '';
}

async function ensurePixel() {
  if (pixelReady || pixelLoading || typeof window === 'undefined') return;
  pixelLoading = true;
  try {
    const response = await fetch('/api/premiere/meta', { cache: 'no-store' });
    const body = response.ok ? await response.json() as { pixelId?: string } : null;
    if (!body?.pixelId) return;
    type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...value: unknown[]) => void; queue: unknown[][]; loaded?: boolean; version?: string };
    const fbq = ((...args: unknown[]) => {
      const queue = (window as unknown as { fbq?: Fbq }).fbq;
      if (queue?.callMethod) queue.callMethod(...args);
      else queue?.queue.push(args);
    }) as Fbq;
    fbq.queue = [];
    fbq.loaded = true;
    fbq.version = '2.0';
    const holder = window as unknown as { fbq?: Fbq };
    if (!holder.fbq) holder.fbq = fbq;
    holder.fbq('init', body.pixelId);
    pixelReady = true;
    pending.splice(0).forEach(args => holder.fbq?.(...args));
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
  } catch { /* analytics stays off */ }
}

export function track(eventName: string, data: Record<string, string | number> = {}) {
  if (typeof window === 'undefined') return;
  const mark = eventName === 'video_progress' ? `${eventName}:${data.progress}` : eventName === 'checkout_validation_error' ? `${eventName}:${data.field}` : '';
  if (mark) {
    if (seen.has(mark)) return;
    seen.add(mark);
  }
  const eventId = uuid();
  const mapping = PIXEL[eventName];
  void ensurePixel().then(() => {
    const fbq = (window as unknown as { fbq?: (...args: unknown[]) => void }).fbq;
    if (!mapping || !fbq) return;
    const args = [mapping[1] ? 'trackCustom' : 'track', mapping[0], data, { eventID: eventId }];
    if (pixelReady) fbq(...args);
    else pending.push(args);
  });
  const body = JSON.stringify({
    visitor_id: visitorId(),
    event_name: eventName,
    occurred_at: new Date().toISOString(),
    path: '/premiere',
    meta_event_id: eventId,
    fbp: cookie('_fbp'),
    fbc: cookie('_fbc'),
    event_data: data,
  });
  if (navigator.sendBeacon) navigator.sendBeacon('/api/premiere/track', new Blob([body], { type: 'application/json' }));
  else void fetch('/api/premiere/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
}
