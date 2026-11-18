import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminConfigured, adminCookieOptions, createAdminSessionToken, verifyAdminPassword } from '../../../../lib/admin/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function json(data: unknown, status: number) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
}

export async function POST(request: Request) {
  let password = '';
  try {
    const body = await request.json() as { password?: unknown };
    if (typeof body.password === 'string') password = body.password;
  } catch {
    return json({ error: '請輸入密碼。' }, 400);
  }
  if (!adminConfigured()) return json({ error: '後台登入尚未完成設定。' }, 503);
  if (!verifyAdminPassword(password)) return json({ error: '密碼不正確。' }, 401);
  const response = json({ ok: true }, 200);
  response.cookies.set(ADMIN_COOKIE, createAdminSessionToken(), adminCookieOptions());
  return response;
}
