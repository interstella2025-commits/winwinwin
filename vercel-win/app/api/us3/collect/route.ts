import { NextResponse } from 'next/server';
import { hashIp, isIgnoredAnalyticsUa } from '../../../../lib/admin/ingest';
import { parseUs3Event, recordUs3Event, us3AllowedOrigin } from '../../../../lib/admin/us3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const buckets = new Map<string, number>();

function limited(ipHash: string, now = Date.now()) {
  const minute = Math.floor(now / 60000);
  const key = `${ipHash.slice(0, 16)}:${minute}`;
  const count = (buckets.get(key) || 0) + 1;
  buckets.set(key, count);
  if (buckets.size > 500) {
    for (const item of buckets.keys()) {
      if (!item.endsWith(`:${minute}`) && !item.endsWith(`:${minute - 1}`)) buckets.delete(item);
    }
  }
  return count > 60;
}

function cors(origin: string | null) {
  const headers: Record<string, string> = { 'Cache-Control': 'no-store', Vary: 'Origin' };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return headers;
}

function json(data: unknown, status: number, origin: string | null) {
  return NextResponse.json(data, { status, headers: cors(origin) });
}

export async function OPTIONS(request: Request) {
  const origin = us3AllowedOrigin(request.headers.get('origin'));
  if (!origin) return new NextResponse(null, { status: 403, headers: cors(null) });
  return new NextResponse(null, { status: 204, headers: cors(origin) });
}

export async function POST(request: Request) {
  const origin = us3AllowedOrigin(request.headers.get('origin'));
  if (!origin) return json({ error: '請從網站送出。' }, 403, null);
  if (isIgnoredAnalyticsUa(request.headers.get('user-agent') || '')) return json({ ok: true }, 200, origin);
  if (limited(hashIp(request))) return json({ error: '請稍後再試。' }, 429, origin);
  let raw = '';
  try {
    raw = await request.text();
  } catch {
    return json({ error: '請重新送出。' }, 400, origin);
  }
  const parsed = parseUs3Event(raw);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status, origin);
  try {
    await recordUs3Event(parsed.value);
    return json({ ok: true }, 200, origin);
  } catch {
    console.error('us3 collect unavailable');
    return json({ error: '目前無法記錄。' }, 503, origin);
  }
}
