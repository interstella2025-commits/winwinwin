import { NextResponse } from 'next/server';
import { isRequestAdmin } from '../../../../lib/admin/auth';
import { reconcile } from '../../../../lib/admin/reconciliation';
import { rangeDays, windowStart } from '../../../../lib/admin/report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

const HEADERS = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };

export async function GET(request: Request) {
  if (!isRequestAdmin(request)) return NextResponse.json({ error: '未登入。' }, { status: 401, headers: HEADERS });
  const params = new URL(request.url).searchParams;
  const days = rangeDays(params.get('range') || undefined);
  try {
    const result = await reconcile(windowStart(days), { provider: params.get('provider') === '1' });
    return NextResponse.json({ days, ...result }, { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: '對帳暫時無法完成。' }, { status: 503, headers: HEADERS });
  }
}
