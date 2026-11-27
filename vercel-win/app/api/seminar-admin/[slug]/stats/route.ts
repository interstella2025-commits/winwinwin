import { gated } from '@/lib/seminar/http';
import { guard, json } from '@/lib/seminar/admin-auth';
import { loadConfig } from '@/lib/seminar/registry';
import { computeStats } from '@/lib/seminar/stats';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'stats'); if (s instanceof Response) return s;
  const { slug } = await params;
  const cfg = await loadConfig(slug); if (!cfg) return json({ error: '找不到場次。' }, 404);
  return json(await computeStats(cfg, new URL(request.url).searchParams.get('demo') === '1'));
}
