import { NextResponse } from 'next/server';
import { isRequestAdmin } from '../../../../lib/admin/auth';
import { loadExcludedTestRegistrations } from '../../../../lib/admin/report';
import { excludedTestRegistrationsCsv } from '../../../../lib/admin/test-registrations';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
  if (!isRequestAdmin(request)) {
    return NextResponse.json({ error: '未登入。' }, { status: 401, headers });
  }
  const csv = excludedTestRegistrationsCsv(await loadExcludedTestRegistrations());
  return new NextResponse(csv, {
    status: 200,
    headers: {
      ...headers,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="win-test-registrations.csv"',
    },
  });
}
