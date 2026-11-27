import { gated } from '@/lib/seminar/http';
import { COOKIE, json } from '@/lib/seminar/admin-auth';

export async function POST() {
  const blocked = gated(); if (blocked) return blocked;
  return json({ ok: true }, 200, { 'Set-Cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0` });
}
