import { metaEventId, sendRegistrationEvents } from '../../../lib/meta/capi';
import { FORM_ORIGINS, digest, validate } from '../../../lib/payuni/core';
import { db, first, settings, json, clientIp, sendOnlineConfirmation } from '../../../lib/payuni/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
let ready: Promise<void> | undefined;
function ensure() {
 if (!ready) ready = db().query(`CREATE TABLE IF NOT EXISTS online_signups (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  application_id TEXT NOT NULL,
  email_status TEXT NOT NULL DEFAULT 'pending',
  email_id TEXT,
  email_lease BIGINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
 )`).then(() => undefined, error => { ready = undefined; throw error; });
 return ready;
}
type AppRow = Record<'name' | 'email' | 'phone' | 'profession' | 'stage' | 'topic' | 'sessionCode' | 'lineName', string>;
/** Free live-online signup. Stores the application, sends the confirmation, never opens PAYUNi. */
export async function POST(request: Request) {
 const origin = request.headers.get('origin');
 if (!origin || !(FORM_ORIGINS.includes(origin) || origin === new URL(request.url).origin)) return json({ error: '請從本頁送出報名。' }, 403);
 let salt = 'win-online-signup';
 try { salt = settings().key; } catch { /* free signup must not depend on PAYUNi */ }
 let body: Record<string, unknown>;
 try {
  if (Number(request.headers.get('content-length') || 0) > 16000) throw new Error();
  const text = await request.text();
  if (text.length > 16000) throw new Error();
  body = JSON.parse(text);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
 } catch { return json({ error: '請重新填寫報名資料。' }, 400); }
 let data;
 try { data = validate(body, 'online'); } catch (e) { return json({ error: e instanceof Error ? e.message : '請重新填寫。' }, 400); }
 try {
  await ensure();
  const requestKey = digest(data.requestId + salt);
  const leadEventId = metaEventId(body.leadEventId), completeEventId = metaEventId(body.completeEventId);
  const fbc = typeof body.fbc === 'string' ? body.fbc : undefined;
  const track = () => sendRegistrationEvents(request, { email: data.email, phone: data.phone, leadEventId, completeEventId, value: 0, fbc });
  const finish = async (signupId: string) => {
   await track();
   if (!await sendOnlineConfirmation(signupId)) return json({ error: '確認信暫時無法寄出，請再試一次。' }, 503);
   return json({ ok: true });
  };
  const old = await first<{ id: string; application_id: string }>('SELECT id,application_id FROM online_signups WHERE request_id=$1', [requestKey]);
  if (old) {
   const existing = await first<AppRow>('SELECT name,email,phone,profession,stage,topic,session_code AS "sessionCode",line_name AS "lineName" FROM applications WHERE id=$1', [old.application_id]);
   if (!existing || (['name', 'email', 'phone', 'profession', 'stage', 'topic', 'sessionCode', 'lineName'] as const).some(k => (existing[k] || '') !== data[k])) return json({ error: '報名資料已變更，請再次送出。', resetRequest: true }, 409);
   return finish(old.id);
  }
  const ip = digest(salt + clientIp(request));
  const bucket = 'online:' + ip + ':' + Math.floor(Date.now() / 60000);
  const rate = await first<{ attempts: number }>('INSERT INTO payment_rate_limits (bucket,attempts) VALUES ($1,1) ON CONFLICT(bucket) DO UPDATE SET attempts=payment_rate_limits.attempts+1 RETURNING attempts', [bucket]);
  if (!rate || Number(rate.attempts) > 5) return json({ error: '送出次數較多，請稍候一分鐘再試。' }, 429);
  const application = crypto.randomUUID(), signup = crypto.randomUUID(), now = new Date().toISOString();
  await db().transaction([
   { text: 'INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', params: [application, data.name, data.email, data.phone, data.profession, data.stage, data.topic, data.sessionCode, data.lineName, now] },
   { text: "INSERT INTO online_signups (id,request_id,application_id,email_status,email_lease,created_at) VALUES ($1,$2,$3,'pending',0,$4)", params: [signup, requestKey, application, now] },
  ]);
  return finish(signup);
 } catch { return json({ error: '暫時無法完成報名，請稍後再試。' }, 503); }
}
