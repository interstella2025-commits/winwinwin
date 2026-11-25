import { store } from './store';
import type { SeminarOrder } from './checkout';
import type { Lead } from './notify';
import type { SeminarConfig } from './types';

type Ev = { type: string; visitor: string; position?: number; meta?: string; demo?: boolean };

/** 後台「數據」頁。只用真實紀錄，不會補數字。 */
export async function computeStats(cfg: SeminarConfig, includeDemo: boolean) {
  const events = (await store().list<Ev>(cfg.slug, 'event', 50_000)).filter(e => includeDemo || !e.data.demo);
  const leads = (await store().list<Lead>(cfg.slug, 'lead')).filter(l => includeDemo || !l.data.demo);
  const orders = await store().list<SeminarOrder>(cfg.slug, 'order');
  const joins = new Set(events.filter(e => e.data.type === 'join').map(e => e.data.visitor));
  const reserved = leads.filter(l => l.data.type === 'reminder');
  const beats = events.filter(e => e.data.type === 'beat');
  // 每分鐘在線：該分鐘內有心跳的訪客數（依影片分鐘）
  const perMinute = new Map<number, Set<string>>();
  const watch = new Map<string, number>();
  for (const b of beats) {
    const minute = Math.floor((b.data.position || 0) / 60);
    if (!perMinute.has(minute)) perMinute.set(minute, new Set());
    perMinute.get(minute)!.add(b.data.visitor);
    watch.set(b.data.visitor, (watch.get(b.data.visitor) || 0) + 0.5);
  }
  const curve = [...perMinute.entries()].sort((a, b) => a[0] - b[0]).map(([m, s]) => ({ minute: m, viewers: s.size }));
  const count = (t: string) => events.filter(e => e.data.type === t).length;
  const progress = Object.fromEntries([25, 50, 75, 100].map(p => [p, new Set(events.filter(e => e.data.type === 'progress' && e.data.meta === String(p)).map(e => e.data.visitor)).size]));
  const noteSaves: Record<string, number> = {};
  for (const e of events.filter(e => e.data.type === 'note_save')) noteSaves[e.data.meta || ''] = (noteSaves[e.data.meta || ''] || 0) + 1;
  const paid = orders.filter(o => o.data.status === 'paid' && !o.data.test).length;
  const watchValues = [...watch.values()];
  return {
    reserved: reserved.length,
    joined: joins.size,
    attendance: reserved.length ? Math.round((joins.size / reserved.length) * 100) : null,
    peak: curve.reduce((m, c) => Math.max(m, c.viewers), 0),
    avgWatchMinutes: watchValues.length ? Math.round((watchValues.reduce((a, b) => a + b, 0) / watchValues.length) * 10) / 10 : 0,
    curve,
    progress,
    offerViews: count('offer_view'),
    ctaClicks: count('cta_click'),
    checkoutOpens: count('checkout_open'),
    formErrors: count('form_error'),
    lineClicks: count('line_click'),
    leads: leads.length,
    leadsByType: Object.fromEntries(['reminder', 'lead', 'form', 'notes'].map(t => [t, leads.filter(l => l.data.type === t).length])),
    noteSaves,
    paid,
    conversion: joins.size ? Math.round((paid / joins.size) * 1000) / 10 : null,
  };
}
