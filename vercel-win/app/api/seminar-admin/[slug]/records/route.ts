import { gated, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { audit, can, guard, json, maskEmail, maskPhone } from '@/lib/seminar/admin-auth';
import { store, type RecordKind } from '@/lib/seminar/store';

type Ctx = { params: Promise<{ slug: string }> };
const VIEW: Record<string, { kind: RecordKind; perm: 'leads' | 'questions' | 'stats' | 'checkout' }> = {
  leads: { kind: 'lead', perm: 'leads' },
  questions: { kind: 'question', perm: 'questions' },
  audit: { kind: 'audit', perm: 'stats' },
  notify: { kind: 'notify', perm: 'stats' },
  orders: { kind: 'order', perm: 'checkout' },
};

export async function GET(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  const view = VIEW[new URL(request.url).searchParams.get('view') || ''];
  if (!view) return json({ error: 'bad view' }, 400);
  const s = guard(request, view.perm); if (s instanceof Response) return s;
  const { slug } = await params;
  const full = can(s.role, 'leadsFull');
  const list = await store().list<Record<string, unknown>>(slug === '_all' && view.kind === 'audit' ? null : slug, view.kind, 1000);
  const rows = list.map(r => {
    const d = { ...r.data };
    if (!full && (view.kind === 'lead' || view.kind === 'order')) {
      if (typeof d.email === 'string') d.email = maskEmail(d.email);
      if (typeof d.phone === 'string') d.phone = maskPhone(d.phone);
    }
    if (view.kind === 'order') { delete d.token; }
    if (view.kind === 'question') { if (!full && typeof d.contact === 'string') d.contact = d.contact ? '已留' : ''; }
    return { id: r.id, createdAt: r.createdAt, slug: r.slug, ...d };
  });
  return json({ rows, masked: !full });
}

/** 審核提問、回覆、置頂，或標記名單已聯絡。 */
export async function PATCH(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { slug } = await params;
  const b = await readJson(request, 6000);
  const rec = await store().get<Record<string, unknown>>(str(b?.id, 64));
  if (!rec || rec.slug !== slug) return json({ error: '找不到資料。' }, 404);
  if (rec.kind === 'question') {
    const s = guard(request, 'questions'); if (s instanceof Response) return s;
    const patch: Record<string, unknown> = {};
    if (['pending', 'shown', 'hidden'].includes(String(b?.status))) patch.status = b?.status;
    if (typeof b?.reply === 'string') patch.reply = str(b.reply, 1000);
    await store().update(rec.id, patch);
    await audit(s, slug, '處理提問', JSON.stringify(patch).slice(0, 120));
    return json({ ok: true });
  }
  if (rec.kind === 'lead') {
    const s = guard(request, 'leads'); if (s instanceof Response) return s;
    await store().update(rec.id, { followed: b?.followed === true, memo: str(b?.memo, 300) });
    await audit(s, slug, '更新名單備註');
    return json({ ok: true });
  }
  return json({ error: '不能修改這種資料。' }, 400);
}
