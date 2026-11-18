import { NextResponse } from 'next/server';
import { isRequestAdmin } from '../../../../lib/admin/auth';
import { loadReport, rangeDays } from '../../../../lib/admin/report';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!isRequestAdmin(request)) {
    return NextResponse.json({ error: '未登入。' }, { status: 401, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  }
  const days = rangeDays(new URL(request.url).searchParams.get('range') || undefined);
  const report = await loadReport(days);
  return NextResponse.json(report, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}
