import { FORM_ORIGINS,digest,validate } from '../../../lib/payuni/core';
import { NOTIFY_CODE } from '../../../lib/course-sessions';
import { db,first,settings,json,clientIp } from '../../../lib/payuni/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
/** Free "其他場次通知" signup: stores the applicant with session_code='notify'. No payment order, no PAYUNi, no email. */
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||!(FORM_ORIGINS.includes(origin)||origin===new URL(request.url).origin))return json({error:'請從本頁送出報名。'},403);
 // Free signup must not depend on PAYUNi credentials; they only salt the rate-limit key when present.
 let salt='win-notify-signup';try{salt=settings().key}catch{}
 let body;try{if(Number(request.headers.get('content-length')||0)>16000)throw new Error();const text=await request.text();if(text.length>16000)throw new Error();body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}catch{return json({error:'請重新填寫報名資料。'},400)}
 let data;try{data=validate(body,'notify')}catch(e){return json({error:e instanceof Error?e.message:'請重新填寫。'},400)}
 try{
 const ip=digest(salt+clientIp(request));const bucket=ip+':'+Math.floor(Date.now()/60000);
 const rate=await first<{attempts:number}>('INSERT INTO payment_rate_limits (bucket,attempts) VALUES ($1,1) ON CONFLICT(bucket) DO UPDATE SET attempts=payment_rate_limits.attempts+1 RETURNING attempts',[bucket]);
 if(!rate||Number(rate.attempts)>5)return json({error:'送出次數較多，請稍候一分鐘再試。'},429);
 await db().transaction([{text:'INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',params:[crypto.randomUUID(),data.name,data.email,data.phone,data.profession,data.stage,data.topic,NOTIFY_CODE,data.lineName,new Date().toISOString()]}]);
 return json({ok:true});
 }catch{return json({error:'暫時無法完成登記，請稍後再試。'},503)}
}
