import crypto from 'crypto';

export const ADMIN_COOKIE = 'win_admin_session';
export const SESSION_SECONDS = 60 * 60 * 12;

type SessionBody = { expiresAt: number };

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('Admin session secret is not set');
  return secret;
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    crypto.timingSafeEqual(left, left);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

function sign(value: string) {
  const encoded = Buffer.from(value, 'utf8').toString('base64url');
  const signature = crypto.createHmac('sha256', sessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function unsign(token: string) {
  const separator = token.lastIndexOf('.');
  if (separator < 1) return null;
  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', sessionSecret()).update(encoded).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    return Buffer.from(encoded, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!password || !expected) return false;
  return safeEqual(password, expected);
}

export function issueAdminSession(expiresAt: number) {
  const body: SessionBody = { expiresAt };
  return sign(JSON.stringify(body));
}

export function createAdminSessionToken() {
  return issueAdminSession(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
}

export function verifyAdminSessionToken(token: string | undefined | null) {
  if (!token || !process.env.ADMIN_SESSION_SECRET) return false;
  try {
    const value = unsign(token);
    if (!value) return false;
    const session = JSON.parse(value) as Partial<SessionBody>;
    return typeof session.expiresAt === 'number' && Number.isInteger(session.expiresAt) && session.expiresAt > Date.now() / 1000;
  } catch {
    return false;
  }
}

export function adminCookieOptions(maxAge = SESSION_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/',
    maxAge,
  };
}

export function readAdminCookie(header: string | null) {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    if (trimmed.slice(0, eq) !== ADMIN_COOKIE) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function isRequestAdmin(request: Request) {
  return verifyAdminSessionToken(readAdminCookie(request.headers.get('cookie')));
}
