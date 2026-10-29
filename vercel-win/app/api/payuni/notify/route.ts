import { decode,verifyOrder } from '../../../../lib/payuni/core';
import { db,settings,readCallback,orderBy,sendPaidEmail } from '../../../../lib/payuni/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
function reply(text:string,status:number){return new Response(text,{status,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'}})}
export async function POST(request:Request){
 let c;try{c=settings()}catch{return reply('RETRY',503)}
 let data;try{data=decode(await readCallback(request),c)}catch{return reply('INVALID',400)}
 try{const order=await orderBy('order_no',data.MerTradeNo||'');if(!order)return reply('INVALID',400);
 let status;try{status=verifyOrder(data,order,c)}catch{return reply('INVALID',400)}
 if(status==='paid'){
 if(!data.TradeNo||data.TradeNo.length>100)return reply('INVALID',400);
 // Idempotent: paid_at is set once; a different provider trade number never overwrites the first.
 await db().query("UPDATE payment_orders SET status='paid',paid_at=COALESCE(paid_at,$1),provider_trade_no=$2,notify_count=notify_count+1 WHERE id=$3 AND (provider_trade_no IS NULL OR provider_trade_no=$4)",[new Date().toISOString(),data.TradeNo,order.id,data.TradeNo]);
 }else{await db().query("UPDATE payment_orders SET status=$1,notify_count=notify_count+1 WHERE id=$2 AND status!='paid'",[status,order.id])}
 const current=await orderBy('order_no',order.order_no);if(!current)return reply('RETRY',503);
 if(current.status==='paid'&&current.provider_trade_no!==data.TradeNo&&status==='paid')return reply('INVALID',400);
 if(current.status==='paid'&&!await sendPaidEmail(current))return reply('RETRY',503);
 return reply('OK',200);
 }catch{return reply('RETRY',503)}
}
