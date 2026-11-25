import { gated, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { audit, can, guard, json } from '@/lib/seminar/admin-auth';
import { BUILTIN, loadConfig, mergeConfig, publicCopyProblems, validSlug } from '@/lib/seminar/registry';
import { store } from '@/lib/seminar/store';
import type { SeminarConfig } from '@/lib/seminar/types';

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'stats'); if (s instanceof Response) return s;
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return json({ error: '找不到場次。' }, 404);
  return json({ config: cfg, problems: publicCopyProblems(cfg), builtin: Boolean(BUILTIN[slug]) });
}

/** 儲存設定。價格與 CTA 模式要有「定價」權限；其餘要有「設定」權限。 */
export async function PUT(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'config'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { slug } = await params;
  const cur = await loadConfig(slug); if (!cur) return json({ error: '找不到場次。' }, 404);
  const body = await readJson(request, 200_000);
  const next = body?.config as Partial<SeminarConfig> | undefined;
  if (!next || typeof next !== 'object') return json({ error: '資料格式不正確。' }, 400);
  const merged = mergeConfig(cur, { ...next, slug, notify: next.notify ?? cur.notify });
  const pricingChanged = merged.cta.mode !== cur.cta.mode || merged.cta.priceTwd !== cur.cta.priceTwd || merged.cta.originalPriceTwd !== cur.cta.originalPriceTwd || merged.cta.target !== cur.cta.target || merged.schedule.offerDeadline !== cur.schedule.offerDeadline;
  if (pricingChanged && !can(s.role, 'pricing')) return json({ error: '修改價格、CTA 模式或截止時間需要管理者權限。' }, 403);
  const approvalChanged = merged.notify.some((t, i) => t.approved !== cur.notify[i]?.approved);
  if (approvalChanged && !can(s.role, 'approve')) return json({ error: '核准群發需要擁有者權限。' }, 403);
  if (!Number.isFinite(merged.cta.priceTwd) || merged.cta.priceTwd < 0 || !Number.isFinite(merged.schedule.durationSeconds) || merged.schedule.durationSeconds < 60) return json({ error: '價格或影片長度不正確。' }, 400);
  if (Number.isNaN(Date.parse(merged.schedule.startAt))) return json({ error: '開始時間格式不正確。' }, 400);
  await store().setConfig(slug, merged);
  await audit(s, slug, '儲存設定', pricingChanged ? '含價格／CTA 變更' : '');
  return json({ ok: true, config: merged, problems: publicCopyProblems(merged), durable: store().durable });
}

/** 複製成新場次。 */
export async function POST(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'config'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { slug } = await params;
  const cur = await loadConfig(slug); if (!cur) return json({ error: '找不到場次。' }, 404);
  const body = await readJson(request, 2000);
  const to = str(body?.to, 50).toLowerCase();
  if (!validSlug(to) || BUILTIN[to] || await store().getConfig(to)) return json({ error: '網址代號只能用小寫英文、數字和連字號，而且不能重複。' }, 400);
  const copy: SeminarConfig = { ...structuredClone(cur), slug: to, kind: 'project', notify: cur.notify.map(t => ({ ...t, approved: t.id === 'reserved' || t.id === 'paid' })) };
  await store().setConfig(to, copy);
  await audit(s, to, '複製場次', `來源 ${slug}`);
  return json({ ok: true, slug: to });
}

/** 刪除後台存的設定（程式內建的會回到預設值）。 */
export async function DELETE(request: Request, { params }: Ctx) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'pricing'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { slug } = await params;
  await store().deleteConfig(slug);
  await audit(s, slug, BUILTIN[slug] ? '還原預設設定' : '刪除場次');
  return json({ ok: true });
}
