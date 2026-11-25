import { fail, gated, isEmail, isPhone, notFound, ok, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { demoAllowed } from '@/lib/seminar/flags';
import { loadConfig } from '@/lib/seminar/registry';
import { store } from '@/lib/seminar/store';
import { trigger, type Lead } from '@/lib/seminar/notify';

const TYPES = ['reminder', 'lead', 'form', 'notes'] as const;

/** 預約提醒、填表、留名單、寄筆記，都寫成一筆名單。 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  if (!sameOrigin(request)) return fail('請從說明會頁面送出。', 403);
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return notFound();
  const body = await readJson(request); if (!body) return fail('資料格式不正確。');
  if (str(body.website)) return ok({ ok: true });
  const type = TYPES.find(t => t === body.type); if (!type) return fail('資料格式不正確。');
  const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), phone = str(body.phone, 30);
  const channels = Array.isArray(body.channels) ? body.channels.filter((c): c is string => c === 'email' || c === 'line') : ['email'];
  const wantsLineOnly = type === 'notes' && channels.length === 1 && channels[0] === 'line';
  if (!name) return fail('請填寫姓名。');
  if (!wantsLineOnly && !isEmail(email)) return fail('請填寫有效的 Email。');
  if (phone && !isPhone(phone)) return fail('手機格式不正確。');
  if (body.consent !== true) return fail('請勾選同意。');
  const fields: Record<string, string> = {};
  if (type === 'form') {
    const raw = (body.fields && typeof body.fields === 'object' ? body.fields : {}) as Record<string, unknown>;
    for (const f of cfg.cta.formFields) {
      const v = str(raw[f.id], 2000);
      if (f.required && !v) return fail(`請填寫「${f.label}」。`);
      if (v) fields[f.id] = v;
    }
  }
  let notes: Lead['notes'];
  if (type === 'notes' && body.notes && typeof body.notes === 'object') {
    const n = body.notes as { saved?: unknown; free?: unknown };
    const saved = Array.isArray(n.saved) ? n.saved.slice(0, 40).flatMap(x => (x && typeof x === 'object' && typeof (x as { text?: unknown }).text === 'string') ? [{ at: Number((x as { at?: unknown }).at) || 0, text: str((x as { text: string }).text, 200) }] : []) : [];
    notes = { saved, free: str(n.free, 4000) };
  }
  const lead: Lead = { type, name, email, phone, channels, fields, notes, visitor: str(body.visitor, 64), demo: body.demo === true && demoAllowed() };
  const rec = await store().add(slug, 'lead', lead as unknown as Record<string, unknown>);
  if (type === 'reminder' && !lead.demo) await trigger(cfg, 'reserved', lead, rec.id);
  return ok({ ok: true });
}
