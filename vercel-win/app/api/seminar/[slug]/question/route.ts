import { fail, gated, notFound, ok, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { demoAllowed } from '@/lib/seminar/flags';
import { loadConfig } from '@/lib/seminar/registry';
import { store } from '@/lib/seminar/store';

type Q = { name: string; body: string; contact: string; visitor: string; status: 'pending' | 'shown' | 'hidden'; reply: string; position: number; demo: boolean };

/** 公開：只回傳已審核顯示的提問。 */
export async function GET(_r: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return notFound();
  const list = (await store().list<Q>(slug, 'question', 500)).filter(q => q.data.status === 'shown');
  return ok({ questions: list.map(q => ({ id: q.id, name: q.data.name, body: q.data.body, reply: q.data.reply, position: q.data.position })) });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  if (!sameOrigin(request)) return fail('請從說明會頁面送出。', 403);
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg || !cfg.questions.enabled) return notFound();
  const body = await readJson(request, 6000); if (!body) return fail('資料格式不正確。');
  if (str(body.website)) return ok({ ok: true });
  const text = str(body.body, 500), name = str(body.name, 40) || '觀眾';
  if (text.length < 2) return fail('請輸入問題內容。');
  const blockedWords = (process.env.SEMINAR_BLOCKED_WORDS || '').split(',').map(s => s.trim()).filter(Boolean);
  const flagged = blockedWords.some(w => text.includes(w));
  const q: Q = { name, body: text, contact: str(body.contact, 200), visitor: str(body.visitor, 64), status: cfg.questions.moderated || flagged ? 'pending' : 'shown', reply: '', position: Number(body.position) || 0, demo: body.demo === true && demoAllowed() };
  await store().add(slug, 'question', q);
  return ok({ ok: true, status: q.status });
}
