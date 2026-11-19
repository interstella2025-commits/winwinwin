import { NextResponse } from 'next/server';
import { hashIp, parseIngest, recordIngest } from '../../../../lib/admin/ingest';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, status: number) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return json({ error: 'Invalid payload' }, 400);
  }
  const parsed = parseIngest(raw, request.headers.get('user-agent') || '');
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  try {
    const saved = await recordIngest(parsed.value, hashIp(request));
    if (!saved.ok) return json({ error: saved.error }, saved.status);
    return json({ ok: true }, 200);
  } catch {
    return json({ error: '目前無法記錄。' }, 503);
  }
}
