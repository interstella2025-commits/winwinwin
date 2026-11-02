import { getPremiereState, premiereDemoRequested } from '@/lib/premiere/state';

export const dynamic = 'force-dynamic';

export function GET(request: Request) {
  const demo = premiereDemoRequested(new URL(request.url).searchParams.get('demo'));
  return Response.json(getPremiereState(new Date(), process.env, { demo }), {
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
