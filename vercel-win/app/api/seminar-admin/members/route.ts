import { gated, isEmail, readJson, sameOrigin, str } from '@/lib/seminar/http';
import { audit, guard, hashPassword, json, ROLE_LABEL, type Role } from '@/lib/seminar/admin-auth';
import { store } from '@/lib/seminar/store';

type Member = { email: string; name: string; role: Role; salt: string; hash: string; active: boolean };
const ROLES: Role[] = ['manager', 'editor', 'viewer'];

export async function GET(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'members'); if (s instanceof Response) return s;
  const list = await store().list<Member>('_admin', 'member');
  return json({ members: list.map(m => ({ id: m.id, email: m.data.email, name: m.data.name, role: m.data.role, roleLabel: ROLE_LABEL[m.data.role], active: m.data.active, createdAt: m.createdAt })) });
}

/** 新增成員。密碼由擁有者設定後自行轉交，系統不會顯示或寄出。 */
export async function POST(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'members'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const b = await readJson(request, 3000);
  const email = str(b?.email, 200).toLowerCase(), name = str(b?.name, 60), role = ROLES.find(r => r === b?.role), password = typeof b?.password === 'string' ? b.password : '';
  if (!isEmail(email) || !role || password.length < 10) return json({ error: '請填寫 Email、角色，密碼至少 10 個字元。' }, 400);
  const exists = (await store().list<Member>('_admin', 'member')).some(m => m.data.email === email);
  if (exists) return json({ error: '這個 Email 已經是成員。' }, 400);
  await store().add('_admin', 'member', { email, name, role, ...hashPassword(password), active: true });
  await audit(s, '_admin', '新增成員', `${email}（${ROLE_LABEL[role]}）`);
  return json({ ok: true });
}

export async function PATCH(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'members'); if (s instanceof Response) return s;
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);
  const b = await readJson(request, 2000);
  const id = str(b?.id, 64);
  const rec = await store().get<Member>(id);
  if (!rec || rec.kind !== 'member') return json({ error: '找不到成員。' }, 404);
  const patch: Partial<Member> = {};
  if (typeof b?.active === 'boolean') patch.active = b.active;
  const role = ROLES.find(r => r === b?.role); if (role) patch.role = role;
  await store().update<Member>(id, patch);
  await audit(s, '_admin', '修改成員', `${rec.data.email} ${JSON.stringify(patch)}`);
  return json({ ok: true });
}
