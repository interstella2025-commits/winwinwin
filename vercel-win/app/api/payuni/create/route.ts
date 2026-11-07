import { metaEventId,sendRegistrationEvents } from '../../../../lib/meta/capi';
import { AMOUNT,FORM_ORIGINS,digest,validate } from '../../../../lib/payuni/core';
import { db,first,settings,json,orderBy,clientIp } from '../../../../lib/payuni/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(!origin||!(FORM_ORIGINS.includes(origin)||origin===new URL(request.url).origin))return json({error:'請從本頁送出報名。'},403);
 let c;try{c=settings()}catch{return json({error:'付款服務尚未開放，請稍後再試。'},503)}
 let body;try{if(Number(request.headers.get('content-length')||0)>16000)throw new Error();const text=await request.text();if(text.length>16000)throw new Error();body=JSON.parse(text);if(!body||typeof body!=='object'||Array.isArray(body))throw new Error()}catch{return json({error:'請重新填寫報名資料。'},400)}
 let data;try{data=validate(body)}catch(e){return json({error:e instanceof Error?e.message:'請重新填寫。'},400)}
 try{
 const requestKey=digest(data.requestId+c.key);const old=await orderBy('request_id',requestKey);
 const leadEventId=metaEventId(body.leadEventId),checkoutEventId=metaEventId(body.checkoutEventId);
 const trackSignup=(orderNo:string)=>sendRegistrationEvents(request,{email:data.email,phone:data.phone,leadEventId,checkoutEventId,value:AMOUNT,orderNo});
 if(old){
 if(old.status!=='paid'&&(old.status!=='pending'||Date.now()-Date.parse(old.created_at)>20*60000))return json({error:'原付款連結已失效，請再次點選付款建立新訂單。',resetRequest:true},409);
 const existing=await first<Record<string,string>>('SELECT name,email,phone,profession,stage,topic,session_code AS "sessionCode",line_name AS "lineName" FROM applications WHERE id=$1',[old.application_id]);
 if(!existing||(['name','email','phone','profession','stage','topic','sessionCode','lineName'] as const).some(k=>existing[k]!==data[k]))return json({error:'報名資料已變更，請再次點選付款建立新訂單。',resetRequest:true},409);
 await trackSignup(old.order_no);
 return json({checkoutUrl:old.status==='paid'?`/payment?token=${old.token}`:`/api/payuni/checkout?token=${old.token}`});
 }
 const ip=digest(c.key+clientIp(request));const bucket=ip+':'+Math.floor(Date.now()/60000);
 const rate=await first<{attempts:number}>('INSERT INTO payment_rate_limits (bucket,attempts) VALUES ($1,1) ON CONFLICT(bucket) DO UPDATE SET attempts=payment_rate_limits.attempts+1 RETURNING attempts',[bucket]);
 if(!rate||Number(rate.attempts)>5)return json({error:'送出次數較多，請稍候一分鐘再試。'},429);
 const id=crypto.randomUUID(),token=crypto.randomUUID(),application=crypto.randomUUID(),now=new Date().toISOString();const orderNo='WIN'+Date.now().toString(36).toUpperCase()+crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();
 await db().transaction([
 {text:'INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',params:[application,data.name,data.email,data.phone,data.profession,data.stage,data.topic,data.sessionCode,data.lineName,now]},
 {text:"INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9,$10)",params:[id,application,orderNo,c.merchant,AMOUNT,token,requestKey,now,now,c.origin+'/#apply']}]);
 await trackSignup(orderNo);
 return json({checkoutUrl:`/api/payuni/checkout?token=${token}`});
 }catch{return json({error:'暫時無法建立付款，請保留資料稍後再試。'},503)}
}
