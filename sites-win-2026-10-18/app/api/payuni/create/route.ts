import { AMOUNT,digest,validate } from '../../../../lib/payuni/core';
import { db,settings,json,orderBy } from '../../../../lib/payuni/server';
import { ACTIVE_SESSION_CATALOG } from '../../../../lib/course-sessions';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'請從本頁送出報名。'},403);
 let c;try{c=settings()}catch{return json({error:'付款服務尚未開放，請稍後再試。'},503)}
 let body;try{if(Number(request.headers.get('content-length')||0)>16000)throw new Error();const text=await request.text();if(text.length>16000)throw new Error();body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}catch{return json({error:'請重新填寫報名資料。'},400)}
 let data;try{data=validate(body)}catch(e){return json({error:e instanceof Error?e.message:'請重新填寫。'},400)}
 try{
 const requestKey=digest(data.requestId+c.key);const old=await orderBy('request_id',requestKey);
 if(old){
 if(old.status!=='paid'&&(old.status!=='pending'||Date.now()-Date.parse(old.created_at)>20*60000))return json({error:'原付款連結已失效，請再次點選付款建立新訂單。',resetRequest:true},409);
 const existing=await db().prepare('SELECT name,email,phone,profession,stage,topic,session_code AS sessionCode,line_name AS lineName FROM applications WHERE id=?').bind(old.application_id).first<Record<string,string>>();
 if(!existing||(['name','email','phone','profession','stage','topic','sessionCode','lineName'] as const).some(k=>existing[k]!==data[k]))return json({error:'報名資料已變更，請再次點選付款建立新訂單。',resetRequest:true},409);
 return json({checkoutUrl:old.status==='paid'?`/payment?token=${old.token}`:`/api/payuni/checkout?token=${old.token}`});
 }
 const ip=digest(c.key+(request.headers.get('cf-connecting-ip')||'unknown'));const bucket=ip+':'+Math.floor(Date.now()/60000);
 const rate=await db().prepare('INSERT INTO payment_rate_limits (bucket,attempts) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(bucket).first<{attempts:number}>();
 if(!rate||rate.attempts>5)return json({error:'送出次數較多，請稍候一分鐘再試。'},429);
 const id=crypto.randomUUID(),token=crypto.randomUUID(),application=crypto.randomUUID(),now=new Date().toISOString();const orderNo='WIN'+Date.now().toString(36).toUpperCase()+crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
 await db().batch([
 db().prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,session_catalog,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').bind(application,data.name,data.email,data.phone,data.profession,data.stage,data.topic,data.sessionCode,data.lineName,ACTIVE_SESSION_CATALOG,now),
 db().prepare('INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source) VALUES (?,?,?,?,?,?,?,\'pending\',?,?,?)').bind(id,application,orderNo,c.merchant,AMOUNT,token,requestKey,now,now,c.origin+'/#apply')]);
 return json({checkoutUrl:`/api/payuni/checkout?token=${token}`});
 }catch{return json({error:'暫時無法建立付款，請保留資料稍後再試。'},503)}
}
