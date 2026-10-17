import { AMOUNT,PRODUCT,VERSION,encrypt,hash,escape } from '../../../../lib/payuni/core';
import { settings,orderBy,json } from '../../../../lib/payuni/server';
export async function GET(request:Request){try{
 const token=new URL(request.url).searchParams.get('token');if(!token||! /^[0-9a-f-]{36}$/i.test(token))return json({error:'付款連結無效。'},400);
 const c=settings(),order=await orderBy('token',token);if(!order)return json({error:'找不到訂單。'},404);
 if(order.status==='paid')return Response.redirect(c.origin+`/payment?token=${token}`,303);
 if(order.status!=='pending'||Date.now()-Date.parse(order.created_at)>20*60000)return Response.redirect(c.origin+`/payment?token=${token}`,303);
 const EncryptInfo=encrypt({MerID:c.merchant,Timestamp:Math.floor(Date.now()/1000),MerTradeNo:order.order_no,TradeAmt:order.amount,ProdDesc:order.source==='win-test-1'?'WIN NT$1 金流驗收測試':PRODUCT,ReturnURL:c.origin+'/api/payuni/return',NotifyURL:c.origin+'/api/payuni/notify',BackURL:c.origin+`/payment?token=${token}`,Credit:1,TradeLExpireSec:600,Lang:'zh-tw'},c);
 const fields={MerID:c.merchant,Version:VERSION,EncryptInfo,HashInfo:hash(EncryptInfo,c)};
 return new Response(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>前往安全付款｜WIN 前導課</title><body><p>${order.source==='win-test-1'?'WIN 金流驗收測試':'WIN 90分鐘線上前導課'}｜NT$${order.amount}</p><p>即將前往付款頁面…</p><form id="pay" method="POST" action="${c.endpoint}">${Object.entries(fields).map(([k,v])=>`<input type="hidden" name="${k}" value="${escape(v)}">`).join('')}<button>前往安全付款 NT$${order.amount}</button></form><script>document.getElementById('pay').submit()</script></body></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':`default-src 'none'; script-src 'unsafe-inline'; form-action ${c.endpoint}; frame-ancestors 'none'`}});
 }catch{return json({error:'付款服務暫時無法使用，請稍後再試。'},503)}}
