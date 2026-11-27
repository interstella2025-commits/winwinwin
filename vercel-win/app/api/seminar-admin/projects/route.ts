import { gated } from '@/lib/seminar/http';
import { guard, json } from '@/lib/seminar/admin-auth';
import { listConfigs } from '@/lib/seminar/registry';

export async function GET(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const s = guard(request, 'stats'); if (s instanceof Response) return s;
  return json({ projects: await listConfigs() });
}
