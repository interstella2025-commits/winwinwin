import { gated } from '@/lib/seminar/http';
import { json, permissions, sessionFrom, ROLE_LABEL } from '@/lib/seminar/admin-auth';
import { store } from '@/lib/seminar/store';
import { checkoutLive, emailEnabled } from '@/lib/seminar/flags';

export async function GET(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const s = sessionFrom(request);
  if (!s) return json({ error: '請先登入。' }, 401);
  return json({ role: s.role, roleLabel: ROLE_LABEL[s.role], who: s.who, permissions: permissions(s.role), durable: store().durable, checkoutLive: checkoutLive(), emailEnabled: emailEnabled() });
}
