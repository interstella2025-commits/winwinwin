import { seminarEnabled } from './flags';

export function notFound() { return new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } }); }
export function ok(data: unknown, status = 200) { return Response.json(data, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer' } }); }
export function fail(error: string, status = 400) { return ok({ error }, status); }

/** 功能沒開就回 404。 */
export function gated() { return seminarEnabled() ? null : notFound(); }

/** 公開表單只接受從同一個網站送出。 */
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === new URL(request.url).host || new URL(origin).host === request.headers.get('host'); } catch { return false; }
}

export async function readJson(request: Request, max = 20_000): Promise<Record<string, unknown> | null> {
  if (Number(request.headers.get('content-length') || 0) > max) return null;
  const text = await request.text();
  if (text.length > max) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}

export function str(v: unknown, max = 500) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }
export function isEmail(v: string) { return v.length <= 200 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
export function isPhone(v: string) { const d = v.replace(/[\s-]/g, ''); return /^(\+?886|0)9\d{8}$/.test(d) || /^\+?\d{8,15}$/.test(d); }
