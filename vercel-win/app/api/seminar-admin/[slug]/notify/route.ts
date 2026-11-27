import { gated, isEmail, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { audit, guard, json } from '@/lib/seminar/admin-auth';
import { loadConfig } from '@/lib/seminar/registry';
import { deliver, render, varsFor } from '@/lib/seminar/notify';
import { emailEnabled } from '@/lib/seminar/flags';

/** 預覽通知內容，或寄一封測試信給自己（寄信開關沒開時只回傳預覽）。 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'config'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return json({ error: '找不到場次。' }, 404);
  const b = await readJson(request, 3000);
  const tpl = cfg.notify.find(t => t.id === b?.id); if (!tpl) return json({ error: '找不到範本。' }, 404);
  const sample = { name: '王小明', email: '', notes: { saved: [{ at: 600, text: '範例重點' }], free: '範例筆記' } };
  const vars = varsFor(cfg, sample);
  const preview = { subject: render(tpl.subject, vars), body: render(tpl.body, vars) };
  const to = str(b?.to, 200).toLowerCase();
  if (b?.send === true) {
    if (!emailEnabled()) return json({ ok: true, preview, sent: false, note: '目前環境沒有開啟寄信，只顯示預覽。' });
    if (!isEmail(to)) return json({ error: '請填寫測試收件 Email。' }, 400);
    await deliver(cfg, { ...tpl, channels: ['email'] }, { ...sample, email: to }, to, 'test');
    await audit(s, slug, '寄送測試通知', tpl.label);
    return json({ ok: true, preview, sent: true });
  }
  return json({ ok: true, preview, sent: false });
}
