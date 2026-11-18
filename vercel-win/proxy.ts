import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
