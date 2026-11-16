import { decode,verifyOrder,PUBLIC_ORIGIN } from '../../../../lib/payuni/core';
import { settings,readCallback,orderBy } from '../../../../lib/payuni/server';
export async function POST(request:Request){
 const origin='https://signature-speaker.elsaliao.chatgpt.site';
 try{const c=settings(),data=decode(await readCallback(request),c),order=await orderBy('order_no',data.MerTradeNo||'');if(!order)throw new Error();verifyOrder(data,order,c);
 // Browser return never changes payment status. Only the verified notification does.
 return Response.redirect((order.source==='win-test-1'?PUBLIC_ORIGIN:origin)+`/payment?token=${order.token}`,303);
 }catch{return Response.redirect(origin+'/payment?state=invalid',303)}
}
export function GET(){return Response.redirect('https://signature-speaker.elsaliao.chatgpt.site/payment?state=invalid',303)}
