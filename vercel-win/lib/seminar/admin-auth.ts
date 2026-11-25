import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { store } from './store';

/**
 * 說明會後台登入。擁有者用既有的 ADMIN_PASSWORD；其他成員由擁有者在後台建立帳號。
 * Session 用 ADMIN_SESSION_SECRET 簽章，放在 HttpOnly cookie。
 */
export type Role = 'owner' | 'manager' | 'editor' | 'viewer';
export const ROLE_LABEL: Record<Role, string> = { owner: '擁有者', manager: '管理者', editor: '小編／客服', viewer: '檢視者' };
export const COOKIE = 'seminar_admin';
const HOURS = 12;

export type Permission = 'config' | 'pricing' | 'checkout' | 'approve' | 'questions' | 'leads' | 'leadsFull' | 'stats' | 'members';
const MATRIX: Record<Role, Permission[]> = {
  owner: ['config', 'pricing', 'checkout', 'approve', 'questions', 'leads', 'leadsFull', 'stats', 'members'],
  manager: ['config', 'questions', 'leads', 'stats'],
  editor: ['questions', 'leads', 'stats'],
  viewer: ['stats'],
};
export function can(role: Role, p: Permission) { return MATRIX[role]?.includes(p) ?? false; }
export function permissions(role: Role) { return MATRIX[role] ?? []; }

export type AdminSession = { role: Role; who: string; exp: number };

function secret() { const s = process.env.ADMIN_SESSION_SECRET; if (!s) throw new Error('not configured'); return s; }
function safeEqual(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); if (x.length !== y.length) { timingSafeEqual(x, x); return false; } return timingSafeEqual(x, y); }

export function adminReady() { return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET); }

export function sign(s: AdminSession) {
  const body = Buffer.from(JSON.stringify(s)).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update('seminar:' + body).digest('base64url')}`;
}
export function verify(token: string | undefined | null): AdminSession | null {
  if (!token || !adminReady()) return null;
  const i = token.lastIndexOf('.'); if (i < 1) return null;
  const body = token.slice(0, i), sig = token.slice(i + 1);
  if (!safeEqual(sig, createHmac('sha256', secret()).update('seminar:' + body).digest('base64url'))) return null;
  try { const s = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminSession; return s.exp > Date.now() / 1000 && s.role in MATRIX ? s : null; } catch { return null; }
}

export function readCookie(header: string | null) {
  for (const part of (header || '').split(';')) { const [k, ...v] = part.trim().split('='); if (k === COOKIE) { try { return decodeURIComponent(v.join('=')); } catch { return null; } } }
  return null;
}
export function sessionFrom(request: Request) { return verify(readCookie(request.headers.get('cookie'))); }
export function cookieHeader(token: string, maxAge = HOURS * 3600) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

export function hashPassword(pw: string, salt = randomBytes(16).toString('hex')) { return { salt, hash: scryptSync(pw, salt, 32).toString('hex') }; }

type Member = { email: string; name: string; role: Role; salt: string; hash: string; active: boolean };

export async function login(email: string, password: string): Promise<AdminSession | null> {
  if (!adminReady() || !password || password.length > 200) return null;
  const exp = Math.floor(Date.now() / 1000) + HOURS * 3600;
  const e = email.trim().toLowerCase();
  if (!e || e === 'owner') return safeEqual(password, process.env.ADMIN_PASSWORD!) ? { role: 'owner', who: '擁有者', exp } : null;
  const members = await store().list<Member>('_admin', 'member');
  const m = members.find(x => x.data.email === e && x.data.active);
  if (!m) { hashPassword(password); return null; }
  return safeEqual(hashPassword(password, m.data.salt).hash, m.data.hash) ? { role: m.data.role, who: m.data.name || m.data.email, exp } : null;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', ...headers } });
}

/** 後台 API 共用檢查：功能有開、已登入、有權限。 */
export function guard(request: Request, p: Permission): AdminSession | Response {
  const s = sessionFrom(request);
  if (!s) return json({ error: '請先登入。' }, 401);
  if (!can(s.role, p)) return json({ error: '你的角色沒有這個權限。' }, 403);
  return s;
}

export async function audit(s: AdminSession, slug: string, action: string, detail = '') {
  try { await store().add(slug, 'audit', { who: s.who, role: s.role, action, detail }); } catch { /* 紀錄失敗不擋操作 */ }
}

/** 名單遮罩：沒有完整權限只看到部分手機和 Email。 */
export function maskPhone(v: string) { return v ? v.slice(0, 4) + '***' + v.slice(-2) : ''; }
export function maskEmail(v: string) { const [a, b] = v.split('@'); return b ? `${a.slice(0, 2)}***@${b}` : v; }
