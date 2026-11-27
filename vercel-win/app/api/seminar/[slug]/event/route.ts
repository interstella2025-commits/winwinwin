import { gated, ok, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { demoAllowed } from '@/lib/seminar/flags';
import { store } from '@/lib/seminar/store';
import { validSlug } from '@/lib/seminar/registry';

const TYPES = new Set(['join', 'beat', 'progress', 'offer_view', 'cta_click', 'checkout_open', 'form_error', 'note_save', 'line_click', 'unmute']);

/** 觀看數據。只記匿名訪客編號，不記姓名或聯絡方式。 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const { slug } = await params;
  if (!validSlug(slug) || !sameOrigin(request)) return ok({ ok: false });
  const body = await readJson(request, 2000);
  const type = str(body?.type, 20);
  if (!body || !TYPES.has(type)) return ok({ ok: false });
  await store().add(slug, 'event', { type, visitor: str(body.visitor, 64), position: Math.max(0, Math.min(86400, Number(body.position) || 0)), meta: str(body.meta, 60), demo: body.demo === true && demoAllowed() });
  return ok({ ok: true });
}
