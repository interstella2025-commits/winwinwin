import { sessionLabel } from '../course-sessions';
import { env } from 'cloudflare:workers';
import { config, PRODUCT, escape } from './core';
export type Order={id:string;application_id:string;order_no:string;merchant:string;amount:number;token:string;status:string;created_at:string;email_status:string;provider_trade_no:string|null;source:string};
export function db(){if(!env.DB)throw new Error('Database unavailable');return env.DB}
export function settings(){return config(env)}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}})}
export async function orderBy(field:'token'|'order_no'|'request_id',value:string){return db().prepare(`SELECT * FROM payment_orders WHERE ${field}=?`).bind(value).first<Order>()}
export async function readCallback(request:Request){
 if(Number(request.headers.get('Content-Length')||0)>150000)throw new Error('Payload too large');const text=await request.text();if(text.length>150000)throw new Error('Payload too large');
 const params=new URLSearchParams(text);const result:Record<string,string>={};for(const [k,v]of params){if(k in result)throw new Error('Duplicate field');result[k]=v}return result;
}
export async function sendPaidEmail(order:Order){
 if(order.status!=='paid')return true;
 const claimed=await db().prepare("UPDATE payment_orders SET email_status='sending',email_lease=? WHERE id=? AND status='paid' AND email_status!='sent' AND (email_status!='sending' OR email_lease<?) RETURNING id").bind(Date.now()+60000,order.id,Date.now()).first();
 if(!claimed){const latest=await orderBy('order_no',order.order_no);return latest?.email_status==='sent'}
 const person=await db().prepare('SELECT name,email,session_code FROM applications WHERE id=?').bind(order.application_id).first<{name:string;email:string;session_code:string|null}>();
 try{
 if(!person||!env.RESEND_API_KEY||!env.RESEND_FROM)throw new Error('Email unavailable');
 const test=order.source==='win-test-1';
 const subject=test?'測試付款成功｜WIN NT$1 金流驗收':'付款成功｜WIN 90分鐘線上前導課';
 const message=test?'NT$1 金流測試款項已收到。此為系統驗收測試，不包含課程報名或席位。':'已收到你的 NT$399 前導課款項。課程所有場次均為線上課程，上課連結將另行通知。此付款僅為線上前導課，不代表正式講師班錄取或費用。';
 const product=test?'WIN NT$1 金流驗收測試':PRODUCT;
 const session=test?null:sessionLabel(person.session_code);
 const schedule=session?`暫定場次：${session}，線上課程；實際安排與上課連結以主辦方通知為準。`:'課程日期與參加方式確定後將另行通知。';
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`win-paid/${order.id}`},body:JSON.stringify({from:env.RESEND_FROM,to:[person.email],subject,text:`${person.name}，你好：\n\n${message}\n\n${test?'':schedule}\n\n項目：${product}\n訂單：${order.order_no}\n\nWIN 課程團隊`,html:`<div lang="zh-Hant" style="font-family:Arial,sans-serif;line-height:1.8;max-width:600px;margin:auto;padding:28px;color:#17243a"><p>${escape(person.name)}，你好：</p><h2>${test?'測試付款成功':'前導課付款成功'}</h2><p>${message}</p>${test?'':`<p>${escape(schedule)}</p>`}<p>項目：${product}<br>金額：NT$${order.amount}<br>訂單：${order.order_no}</p><p>WIN 課程團隊</p></div>`,...(env.RESEND_REPLY_TO?{reply_to:env.RESEND_REPLY_TO}:{})}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Email rejected');const result=await response.json() as {id?:string};
 await db().prepare("UPDATE payment_orders SET email_status='sent',email_id=?,email_lease=0 WHERE id=?").bind(result.id||null,order.id).run();return true;
 }catch{await db().prepare("UPDATE payment_orders SET email_status='failed',email_lease=0 WHERE id=? AND email_status='sending'").bind(order.id).run();return false}
}
