import { gated, notFound } from '@/lib/seminar/http';
import { checkoutLive } from '@/lib/seminar/flags';
import { findOrder, payuniForm } from '@/lib/seminar/checkout';

/** 自動送出到 PAYUNi 的轉址頁。訂單 20 分鐘內有效。 */
export async function GET(_r: Request, { params }: { params: Promise<{ token: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  if (!checkoutLive()) return notFound();
  const { token } = await params;
  const rec = await findOrder('token', token);
  if (!rec || rec.data.status !== 'pending' || Date.now() - Date.parse(rec.createdAt) > 20 * 60000) return notFound();
  const { html, endpoint } = payuniForm(rec.data, rec.slug);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; form-action ${endpoint}; frame-ancestors 'none'` } });
}
