import { gated, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { adminReady, cookieHeader, json, login, sign } from '@/lib/seminar/admin-auth';

const attempts = new Map<string, { n: number; until: number }>();

export async function POST(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  if (!adminReady()) return json({ error: '後台尚未設定密碼。' }, 503);
  if (!sameOrigin(request)) return json({ error: '請從後台頁面登入。' }, 403);
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'x';
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return json({ error: '嘗試太多次，請 10 分鐘後再試。' }, 429);
  const body = await readJson(request, 2000);
  const s = await login(str(body?.email, 200), typeof body?.password === 'string' ? body.password : '');
  if (!s) {
    const n = (a?.n || 0) + 1;
    attempts.set(ip, { n, until: n >= 8 ? Date.now() + 600_000 : 0 });
    return json({ error: '帳號或密碼不正確。' }, 401);
  }
  attempts.delete(ip);
  return json({ ok: true, role: s.role, who: s.who }, 200, { 'Set-Cookie': cookieHeader(sign(s)) });
}
