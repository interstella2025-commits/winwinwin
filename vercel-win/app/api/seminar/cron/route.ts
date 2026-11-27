import { gated, ok, fail } from '@/lib/seminar/http';
import { listConfigs, loadConfig } from '@/lib/seminar/registry';
import { runSchedule } from '@/lib/seminar/notify';
import { emailEnabled } from '@/lib/seminar/flags';

/** 排程通知。要帶 Authorization: Bearer <CRON_SECRET>。寄信開關沒開時不會寄出任何東西。 */
export async function GET(request: Request) {
  const blocked = gated(); if (blocked) return blocked;
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return fail('unauthorized', 401);
  if (!emailEnabled()) return ok({ ok: true, sent: 0, note: 'email disabled' });
  let sent = 0;
  for (const p of await listConfigs()) { if (p.kind !== 'project') continue; const cfg = await loadConfig(p.slug); if (cfg) sent += await runSchedule(cfg); }
  return ok({ ok: true, sent });
}
