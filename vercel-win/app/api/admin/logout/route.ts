import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions } from '../../../../lib/admin/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/admin', request.url), 303);
  response.cookies.set(ADMIN_COOKIE, '', adminCookieOptions(0));
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
