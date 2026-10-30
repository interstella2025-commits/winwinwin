import { getPremiereState } from '@/lib/premiere/state';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(getPremiereState(new Date()), {
    headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' },
  });
}
