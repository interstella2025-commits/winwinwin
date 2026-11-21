'use client';

import { useEffect } from 'react';
import { offerFromForm, outcomeKind } from '../lib/admin/tracking';

const SESSION_KEY = 'win_analytics_session_id';
const VISITOR_KEY = 'win_analytics_visitor_id';
const STARTED_KEY = 'win_analytics_started_at';

type TrackEvent = {
  name: string;
  offer?: string;
  sectionId?: string;
  pagePath: string;
  occurredAt: string;
  data?: Record<string, string | number>;
};

function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    const value = character === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function storageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Private mode can reject storage; the visit still uses an in-memory id.
  }
}

function requestUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

export default function SiteAnalytics() {
  useEffect(() => {
    if (window.location.pathname.startsWith('/admin')) return undefined;
    let visitorId = storageGet(window.localStorage, VISITOR_KEY) || '';
    let sessionId = storageGet(window.sessionStorage, SESSION_KEY) || '';
    let startedAt = storageGet(window.sessionStorage, STARTED_KEY) || '';
    if (!visitorId) {
      visitorId = uuid();
      storageSet(window.localStorage, VISITOR_KEY, visitorId);
    }
    if (!sessionId) {
      sessionId = uuid();
      storageSet(window.sessionStorage, SESSION_KEY, sessionId);
    }
    if (!startedAt) {
      startedAt = new Date().toISOString();
      storageSet(window.sessionStorage, STARTED_KEY, startedAt);
    }
    const startedMs = Date.now();
    const queue: TrackEvent[] = [];
    let flushTimer = 0;
    let formStarted = false;
    const startedOffers = new Set<string>();
    let ended = false;
    const seenDepth = new Set<number>();

    const pagePath = () => `${window.location.pathname}`.slice(0, 300);
    const currentOffer = () => {
      const form = document.querySelector('#apply form');
      if (!(form instanceof HTMLFormElement)) return 'unknown';
      const format = form.querySelector('select[name="courseFormat"]');
      const selected = form.querySelector('input[name="sessionCode"]:checked');
      return offerFromForm(format instanceof HTMLSelectElement ? format.value : '', selected instanceof HTMLInputElement ? selected.value : '');
    };
    const payload = () => JSON.stringify({
      visitorId,
      sessionId,
      startedAt,
      landingUrl: window.location.href.slice(0, 2048),
      referrer: document.referrer.slice(0, 2048) || undefined,
      viewportWidth: window.innerWidth,
      events: queue.splice(0, queue.length),
    });
    const flush = (beacon = false) => {
      window.clearTimeout(flushTimer);
      if (!queue.length) return;
      const body = payload();
      if (beacon && navigator.sendBeacon) {
        try {
          if (navigator.sendBeacon('/api/analytics/events', new Blob([body], { type: 'application/json' }))) return;
        } catch {
          // Fall through to fetch when the browser refuses the beacon.
        }
      }
      void originalFetch('/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    };
    const enqueue = (event: Omit<TrackEvent, 'pagePath' | 'occurredAt'>, immediate = false) => {
      queue.push({ ...event, pagePath: pagePath(), occurredAt: new Date().toISOString() });
      if (immediate || queue.length >= 8) flush();
      else {
        window.clearTimeout(flushTimer);
        flushTimer = window.setTimeout(() => flush(), 1200);
      }
    };
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const response = await originalFetch(input, init);
      const url = requestUrl(input);
      if (!url.includes('/api/analytics/events')) {
        let copy: Response | null = null;
        try {
          copy = response.clone();
        } catch {
          copy = null;
        }
        if (copy) {
          void copy.json().then(body => {
            const kind = outcomeKind(new URL(url, window.location.origin).pathname, body as { ok?: boolean; checkoutUrl?: string });
            if (!kind) return;
            const offer = currentOffer();
            enqueue({ name: 'form_submit_ok', offer, sectionId: 'form' });
            enqueue({ name: kind, offer, sectionId: kind === 'payment_start' ? 'payment' : 'form' }, true);
          }).catch(() => undefined);
        }
      }
      return response;
    };

    const onClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('a[href="#apply"], a[href$="#apply"]')) {
        enqueue({ name: 'cta_click', sectionId: 'cta' });
        return;
      }
      if (target.closest('a.line-support')) enqueue({ name: 'contact_click', sectionId: 'line', data: { method: 'line' } });
    };
    const onFocus = (event: Event) => {
      if (formStarted) return;
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('#apply form')) return;
      formStarted = true;
      const offer = currentOffer();
      startedOffers.add(offer);
      enqueue({ name: 'form_start', offer, sectionId: 'form' });
    };
    const onOfferChange = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('#apply form')) return;
      const field = target instanceof HTMLSelectElement || target instanceof HTMLInputElement ? target : null;
      if (!field || (field.name !== 'courseFormat' && field.name !== 'sessionCode')) return;
      const offer = currentOffer();
      if (offer === 'unknown') return;
      if (!formStarted) formStarted = true;
      if (startedOffers.has(offer)) return;
      startedOffers.add(offer);
      enqueue({ name: 'form_start', offer, sectionId: 'form' });
    };
    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.closest('#apply')) return;
      enqueue({ name: 'form_submit', offer: currentOffer(), sectionId: 'form' }, true);
    };
    const onScroll = () => {
      const height = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const depth = Math.min(100, Math.round((window.scrollY / height) * 100));
      for (const mark of [25, 50, 75, 90]) {
        if (depth < mark || seenDepth.has(mark)) continue;
        seenDepth.add(mark);
        enqueue({ name: 'scroll_depth', sectionId: 'scroll', data: { depth: mark } });
      }
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      const height = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const depth = Math.min(100, Math.round((window.scrollY / height) * 100));
      enqueue({
        name: 'session_end',
        sectionId: 'page',
        data: { durationSeconds: Math.max(0, Math.round((Date.now() - startedMs) / 1000)), depth },
      }, true);
    };
    const ping = window.setInterval(() => {
      enqueue({ name: 'dwell_ping', sectionId: 'page', data: { durationSeconds: Math.max(0, Math.round((Date.now() - startedMs) / 1000)) } });
    }, 15000);

    document.addEventListener('click', onClick, true);
    document.addEventListener('focusin', onFocus, true);
    document.addEventListener('change', onOfferChange, true);
    document.addEventListener('submit', onSubmit, true);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pagehide', finish);
    enqueue({ name: window.location.pathname === '/payment' ? 'payment_return' : 'page_view', sectionId: 'page' }, true);

    return () => {
      window.clearInterval(ping);
      window.clearTimeout(flushTimer);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('change', onOfferChange, true);
      document.removeEventListener('submit', onSubmit, true);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', finish);
      window.fetch = originalFetch;
      flush(true);
    };
  }, []);

  return null;
}
