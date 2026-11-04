import { COURSE_SESSIONS, NOTIFY_CODE } from '../course-sessions';
import { createCipheriv, createDecipheriv, createHash, timingSafeEqual } from 'node:crypto';
export const AMOUNT = 399;
export const PRODUCT = 'Expert to Enterprise WIN講師班｜90分鐘線上前導課';
/** Public sales site. All PAYUNi Return/Notify/Back URLs point here. */
export const PUBLIC_ORIGIN = 'https://2027course.win-lin.com';
/** Origins allowed to submit the registration form. */
export const FORM_ORIGINS = [PUBLIC_ORIGIN, 'https://win-lecturer-20261018.vercel.app'];
export const VERSION = '2.0';
export type Config = { merchant: string; key: string; iv: string; origin: string; endpoint: string };
export function config(env: Record<string, string | undefined>): Config {
 const merchant=env.PAYUNI_MER_ID?.trim(),key=env.PAYUNI_HASH_KEY?.trim(),iv=env.PAYUNI_HASH_IV?.trim();
 if(!merchant||!key||!iv||Buffer.byteLength(key)!==32||Buffer.byteLength(iv)!==16) throw new Error('Payment not configured');
 return {merchant,key,iv,origin:PUBLIC_ORIGIN,endpoint:env.PAYUNI_API_ENDPOINT?.trim()||'https://api.payuni.com.tw/api/upp'};
}
export function hash(payload:string,c:Config){return createHash('sha256').update(c.key+payload+c.iv).digest('hex').toUpperCase()}
export function encrypt(fields:Record<string,string|number>,c:Config){
 const cipher=createCipheriv('aes-256-gcm',Buffer.from(c.key),Buffer.from(c.iv));
 const data=Buffer.concat([cipher.update(new URLSearchParams(Object.entries(fields).map(([k,v])=>[k,String(v)])).toString(),'utf8'),cipher.final()]);
 return Buffer.from(data.toString('base64')+':::'+cipher.getAuthTag().toString('base64')).toString('hex');
}
export function decode(fields:Record<string,string>,c:Config){
 const encrypted=fields.EncryptInfo,signature=fields.HashInfo?.toUpperCase();
 if(fields.MerID!==c.merchant||fields.Version!==VERSION||!encrypted||encrypted.length>100000||encrypted.length%2||!/^[a-f0-9]+$/i.test(encrypted)||!/^[A-F0-9]{64}$/.test(signature||''))throw new Error('Invalid callback');
 if(!timingSafeEqual(Buffer.from(hash(encrypted,c)),Buffer.from(signature)))throw new Error('Invalid signature');
 const [data,tag,extra]=Buffer.from(encrypted,'hex').toString('utf8').split(':::');if(!data||!tag||extra!==undefined)throw new Error('Invalid payload');
 const cipher=createDecipheriv('aes-256-gcm',Buffer.from(c.key),Buffer.from(c.iv));cipher.setAuthTag(Buffer.from(tag,'base64'));
 const values=Object.fromEntries(new URLSearchParams(Buffer.concat([cipher.update(Buffer.from(data,'base64')),cipher.final()]).toString('utf8')));
 if(values.MerID!==c.merchant)throw new Error('Invalid merchant');return values;
}
export function verifyOrder(data:Record<string,string>,order:{merchant:string;order_no:string;amount:number;source?:string},c:Config){
 if(data.MerTradeNo!==order.order_no||data.MerID!==order.merchant||order.merchant!==c.merchant||!/^\d+$/.test(data.TradeAmt||'')||Number(data.TradeAmt)!==order.amount||order.amount!==(order.source==='win-test-1'?1:AMOUNT))throw new Error('Order mismatch');
 return data.TradeStatus==='1'?'paid':data.TradeStatus==='0'?'pending':['2','3','4'].includes(data.TradeStatus)?'failed':'unknown';
}
export const PHONE_ERROR='請輸入正確的台灣手機號碼，例：0912 345 678';
export function validate(body:Record<string,unknown>,kind:'paid'|'notify'='paid'){
 const keys=['name','email','phone','profession','stage','topic','sessionCode','lineName'] as const;
 const values=Object.fromEntries(keys.map(k=>[k,typeof body[k]==='string'?body[k].trim():''])) as Record<typeof keys[number],string>;
 if(body.website||body.consent!==true||keys.some(k=>values[k].length>1000)||['name','email','phone'].some(k=>!values[k as keyof typeof values])||(kind==='notify'?values.sessionCode!==NOTIFY_CODE:!COURSE_SESSIONS.some(s=>s.code===values.sessionCode))||values.email.length>200||!/^\S+@\S+\.\S+$/.test(values.email)||typeof body.requestId!=='string'||! /^[0-9a-f-]{36}$/i.test(body.requestId))throw new Error('請完整填寫必填欄位、有效 Email 並勾選同意。');
 const phone=values.phone.replace(/[\s-]/g,'');if(!/^09\d{8}$/.test(phone))throw new Error(PHONE_ERROR);
 return {...values,phone,requestId:body.requestId};
}
export function digest(value:string){return createHash('sha256').update(value).digest('hex')}
export function escape(value:string){return value.replace(/[&<>"']/g,v=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[v]!))}
