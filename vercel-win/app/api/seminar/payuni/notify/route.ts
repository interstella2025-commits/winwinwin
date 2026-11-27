import { gated } from '@/lib/seminar/http';
import { settle } from '@/lib/seminar/checkout';
import { loadConfig } from '@/lib/seminar/registry';
import { trigger } from '@/lib/seminar/notify';

async function fields(request: Request) {
  const text = await request.text();
  if (text.length > 150_000) throw new Error('size');
  return Object.fromEntries(new URLSearchParams(text));
}

/** PAYUNi 伺服器通知。只有驗證通過才標已付款，付款成功信只寄一次。 */
export async function POST(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  try {
    const { rec, newlyPaid } = await settle(await fields(request));
    if (newlyPaid) { const cfg = await loadConfig(rec.slug); if (cfg) await trigger(cfg, 'paid', { name: rec.data.name, email: rec.data.email }, rec.id); }
    return new Response('SUCCESS');
  } catch {
    return new Response('FAIL', { status: 400 });
  }
}
