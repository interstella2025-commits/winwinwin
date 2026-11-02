import { pixelId } from '@/lib/premiere/analytics';

export const dynamic = 'force-dynamic';

export function GET() {
  const id = pixelId();
  return Response.json({ pixelId: id || null }, { headers: { 'Cache-Control': 'no-store' } });
}
