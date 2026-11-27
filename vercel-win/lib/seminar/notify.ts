import { emailEnabled, siteOrigin } from './flags';
import { formatTaipei } from './clock';
import { store } from './store';
import type { NotifyTemplate, SeminarConfig } from './types';

export type Lead = { type: 'reminder' | 'lead' | 'form' | 'notes'; name: string; email: string; phone: string; channels: string[]; fields: Record<string, string>; notes?: { saved: Array<{ at: number; text: string }>; free: string }; visitor: string; demo: boolean };

export function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{([^{}]{1,12})\}/g, (m, k: string) => (k in vars ? vars[k] : m));
}

export function varsFor(cfg: SeminarConfig, lead: Partial<Lead>): Record<string, string> {
  const url = `${siteOrigin()}/seminar/${cfg.slug}`;
  return {
    姓名: lead.name || '你',
    開始時間: formatTaipei(cfg.schedule.startAt),
    觀看連結: url,
    報名連結: cfg.cta.mode === 'booking' && cfg.cta.target ? cfg.cta.target : url,
    截止時間: cfg.schedule.offerDeadline ? formatTaipei(cfg.schedule.offerDeadline) : '說明會結束時',
    下一場: cfg.schedule.nextSession?.label || '另行通知',
    重點清單: (lead.notes?.saved || []).map(n => `・${n.text}`).join('\n') || '（沒有存下重點）',
    自由筆記: lead.notes?.free || '',
  };
}

/** 寄 Email。開關沒開時只記錄「未寄出」，不會寄給任何人。LINE 推播需要 LINE Messaging API，尚未設定時只記錄。 */
export async function deliver(cfg: SeminarConfig, tpl: NotifyTemplate, lead: Partial<Lead>, to: string, leadId: string) {
  const vars = varsFor(cfg, lead);
  const subject = render(tpl.subject, vars);
  const body = render(tpl.body, vars);
  let status = 'skipped';
  if (tpl.channels.includes('email') && to && emailEnabled()) {
    try {
      const from = process.env.SEMINAR_EMAIL_FROM || process.env.RESEND_FROM || '';
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `seminar/${cfg.slug}/${tpl.id}/${leadId}` },
        body: JSON.stringify({ from, to: [to], subject, text: body }),
        signal: AbortSignal.timeout(10_000),
      });
      status = r.ok ? 'sent' : 'failed';
    } catch { status = 'failed'; }
  }
  await store().add(cfg.slug, 'notify', { template: tpl.id, leadId, to: to ? to.replace(/^(.{2}).*(@.*)$/, '$1***$2') : '', channel: tpl.channels.join('+'), status, subject });
  return { status, subject, body };
}

/** 事件觸發的通知（預約成功、付款成功）。 */
export async function trigger(cfg: SeminarConfig, id: NotifyTemplate['id'], lead: Partial<Lead>, leadId: string) {
  const tpl = cfg.notify.find(t => t.id === id);
  if (!tpl || !tpl.enabled || !tpl.approved || !lead.email) return null;
  return deliver(cfg, tpl, lead, lead.email, leadId);
}

/** 排程通知：由 /api/seminar/cron 每 5 分鐘呼叫。已寄過的不會重寄，沒核准的不寄。 */
export async function runSchedule(cfg: SeminarConfig, now = Date.now()) {
  const start = Date.parse(cfg.schedule.startAt), end = start + cfg.schedule.durationSeconds * 1000;
  const leads = await store().list<Lead>(cfg.slug, 'lead');
  const sent = new Set((await store().list<{ template: string; leadId: string }>(cfg.slug, 'notify')).map(r => `${r.data.template}/${r.data.leadId}`));
  const attended = new Set((await store().list<{ visitor: string; type: string }>(cfg.slug, 'event')).filter(e => e.data.type === 'join').map(e => e.data.visitor));
  let count = 0;
  for (const tpl of cfg.notify) {
    if (!tpl.enabled || !tpl.approved || tpl.offsetMinutes === null) continue;
    const at = tpl.offsetMinutes <= 0 ? start + tpl.offsetMinutes * 60000 : end + tpl.offsetMinutes * 60000;
    if (now < at || now > at + 6 * 3600_000) continue;
    for (const l of leads) {
      if (l.data.demo || sent.has(`${tpl.id}/${l.id}`)) continue;
      if (tpl.id === 'notes' && !(l.data.notes && l.data.notes.saved.length)) continue;
      if (tpl.id === 'noShow' && attended.has(l.data.visitor)) continue;
      await deliver(cfg, tpl, l.data, l.data.email, l.id); count++;
    }
  }
  return count;
}
