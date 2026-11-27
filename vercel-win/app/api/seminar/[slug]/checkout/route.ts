import { fail, gated, isEmail, isPhone, notFound, ok, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { checkoutLive, demoAllowed } from '@/lib/seminar/flags';
import { loadConfig, publicCopyProblems } from '@/lib/seminar/registry';
import { createOrder } from '@/lib/seminar/checkout';
import { store } from '@/lib/seminar/store';

/**
 * 刷卡模式。開關沒開（預覽預設）時只驗證欄位並回覆「預覽不會付款」，不建立訂單。
 * 開關打開時才建立訂單並把付款網址交給瀏覽器。
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  if (!sameOrigin(request)) return fail('請從說明會頁面送出。', 403);
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return notFound();
  const body = await readJson(request); if (!body) return fail('資料格式不正確。');
  const demo = body.demo === true && demoAllowed();
  if (cfg.cta.mode !== 'card' && !demo) return notFound();
  if (str(body.website)) return ok({ ok: true, mode: 'preview' });
  const name = str(body.name, 80), email = str(body.email, 200).toLowerCase(), phone = str(body.phone, 30);
  if (!name || !isEmail(email) || !isPhone(phone)) return fail('請填寫姓名、有效的手機與 Email。');
  if (body.consent !== true) return fail('請勾選同意。');
  if (!checkoutLive() || demo) {
    await store().add(slug, 'lead', { type: 'form', name, email, phone, channels: ['email'], fields: { 意向: '刷卡（預覽，未付款）' }, visitor: str(body.visitor, 64), demo: true });
    return ok({ ok: true, mode: 'preview' });
  }
  if (publicCopyProblems(cfg).length) return fail('付款尚未開放。', 503);
  try {
    const order = await createOrder(cfg, { name, email, phone });
    await store().add(slug, 'lead', { type: 'form', name, email, phone, channels: ['email'], fields: { 訂單: order.orderNo }, visitor: str(body.visitor, 64), demo: false });
    return ok({ ok: true, mode: 'live', url: `/api/seminar/pay/${order.token}` });
  } catch {
    return fail('付款服務暫時無法使用，請稍後再試。', 503);
  }
}
