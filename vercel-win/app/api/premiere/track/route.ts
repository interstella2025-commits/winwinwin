import { META_EVENTS, sendCapi } from '@/lib/premiere/analytics';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: Record<string, unknown> | null = null;
  try {
    const text = await request.text();
    if (text.length > 8000) return Response.json({ ok: false }, { status: 202 });
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    body = null;
  }
  const name = typeof body?.event_name === 'string' ? body.event_name : '';
  const mapping = META_EVENTS[name as keyof typeof META_EVENTS];
  const eventId = typeof body?.meta_event_id === 'string' ? body.meta_event_id : '';
  if (mapping && eventId) {
    await sendCapi({
      eventName: mapping[0],
      eventId,
      eventTime: typeof body?.occurred_at === 'string' ? body.occurred_at : undefined,
      path: '/premiere',
      visitorId: typeof body?.visitor_id === 'string' ? body.visitor_id : undefined,
      fbp: typeof body?.fbp === 'string' ? body.fbp : undefined,
      fbc: typeof body?.fbc === 'string' ? body.fbc : undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      data: body?.event_data,
    });
  }
  return Response.json({ ok: true }, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
