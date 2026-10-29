import { decode,verifyOrder,PUBLIC_ORIGIN } from '../../../../lib/payuni/core';
import { settings,readCallback,orderBy } from '../../../../lib/payuni/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){
 try{const c=settings(),data=decode(await readCallback(request),c),order=await orderBy('order_no',data.MerTradeNo||'');if(!order)throw new Error();verifyOrder(data,order,c);
 // Browser return never changes payment status. Only the verified notification does.
 return Response.redirect(PUBLIC_ORIGIN+`/payment?token=${order.token}`,303);
 }catch{return Response.redirect(PUBLIC_ORIGIN+'/payment?state=invalid',303)}
}
export function GET(){return Response.redirect(PUBLIC_ORIGIN+'/payment?state=invalid',303)}
