import { sessionLabel } from '../course-sessions';
import { config, PRODUCT, escape } from './core';
import { db, first } from './db';
// Sender is fixed to the verified Resend domain mail.win-lin.com; no reply-to.
export const EMAIL_FROM='WIN講師班 <noreply@mail.win-lin.com>';
export { db, first };
export type Order={id:string;application_id:string;order_no:string;merchant:string;amount:number;token:string;status:string;created_at:string;email_status:string;provider_trade_no:string|null;source:string};
export function settings(){return config(process.env)}
export function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'}})}
export async function orderBy(field:'token'|'order_no'|'request_id',value:string){const o=await first<Order>(`SELECT * FROM payment_orders WHERE ${field}=$1`,[value]);if(o)o.amount=Number(o.amount);return o}
export function clientIp(request:Request){return request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown'}
export async function readCallback(request:Request){
 if(Number(request.headers.get('Content-Length')||0)>150000)throw new Error('Payload too large');const text=await request.text();if(text.length>150000)throw new Error('Payload too large');
 const params=new URLSearchParams(text);const result:Record<string,string>={};for(const [k,v]of params){if(k in result)throw new Error('Duplicate field');result[k]=v}return result;
}
export async function sendPaidEmail(order:Order){
 if(order.status!=='paid')return true;
 const env=process.env;
 const claimed=await first("UPDATE payment_orders SET email_status='sending',email_lease=$1 WHERE id=$2 AND status='paid' AND email_status!='sent' AND (email_status!='sending' OR email_lease<$3) RETURNING id",[Date.now()+60000,order.id,Date.now()]);
 if(!claimed){const latest=await orderBy('order_no',order.order_no);return latest?.email_status==='sent'}
 const person=await first<{name:string;email:string;session_code:string|null}>('SELECT name,email,session_code FROM applications WHERE id=$1',[order.application_id]);
const LINE_URL='https://line.me/R/ti/p/@dmd9019a';
const FOOTER_TEXT='此封信件為系統自動發送，請勿直接回覆。如有任何問題，歡迎透過 LINE 官方帳號與我們聯繫。';
 try{
 if(!person||!env.RESEND_API_KEY)throw new Error('Email unavailable');
 const test=order.source==='win-test-1';
 const subject=test?'測試付款成功｜WIN NT$1 金流驗收':'付款成功｜Expert to Enterprise WIN講師班 90分鐘線上前導課';
 const message=test?'NT$1 金流測試款項已收到。此為系統驗收測試，不包含課程報名或席位。':'已收到你的 NT$399 前導課款項。此付款僅為線上前導課，不代表正式講師班錄取或費用。';
 const product=test?'WIN NT$1 金流驗收測試':PRODUCT;
 const session=test?null:sessionLabel(person.session_code);
 const schedule=session?`場次：${session}，線上課程。上課連結將於開課前寄送至您的 Email，請留意信箱。`:'課程日期與參加方式確定後將另行通知。';
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`win-paid/${order.id}`},body:JSON.stringify({from:EMAIL_FROM,to:[person.email],subject,text:`${person.name}，你好：\n\n${message}\n\n${test?'':schedule}\n\n項目：${product}\n訂單：${order.order_no}\n\nWIN 課程團隊\n\n${FOOTER_TEXT}：${LINE_URL}`,html:`<div lang="zh-Hant" style="font-family:Arial,sans-serif;line-height:1.8;max-width:600px;margin:auto;padding:28px;color:#17243a"><p>${escape(person.name)}，你好：</p><h2>${test?'測試付款成功':'前導課付款成功'}</h2><p>${message}</p>${test?'':`<p>${escape(schedule)}</p>`}<p>項目：${product}<br>金額：NT$${order.amount}<br>訂單：${order.order_no}</p><p>WIN 課程團隊</p><p style="margin-top:24px;padding-top:16px;border-top:1px solid #e3e7ee;font-size:14px;color:#5b6577">${FOOTER_TEXT.replace('LINE 官方帳號',`<a href="${LINE_URL}" style="color:#17243a;font-weight:inherit;text-decoration:underline">LINE 官方帳號</a>`)}</p></div>`}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Email rejected');const result=await response.json() as {id?:string};
 await db().query("UPDATE payment_orders SET email_status='sent',email_id=$1,email_lease=0 WHERE id=$2",[result.id||null,order.id]);return true;
 }catch{await db().query("UPDATE payment_orders SET email_status='failed',email_lease=0 WHERE id=$1 AND email_status='sending'",[order.id]);return false}
}
