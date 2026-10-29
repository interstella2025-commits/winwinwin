import { timingSafeEqual } from 'node:crypto';
import { digest } from '../../../../../lib/payuni/core';
import { db,settings,json } from '../../../../../lib/payuni/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
/** NT$1 production acceptance test. Each call creates a NEW order; the browser returns to 2027course. */
export async function POST(request:Request){
 const secret=process.env.PAYUNI_TEST_ACCESS,header=request.headers.get('authorization');
 if(!secret||!header||!timingSafeEqual(Buffer.from(digest(header)),Buffer.from(digest('Bearer '+secret))))return json({error:'Not found'},404);
 try{const c=settings();const requestId=digest('win-test-1/'+crypto.randomUUID());
 const id=crypto.randomUUID(),application=crypto.randomUUID(),token=crypto.randomUUID(),now=new Date().toISOString(),orderNo='WINT'+Date.now().toString(36).toUpperCase()+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
 const email=process.env.PAYUNI_TEST_EMAIL?.trim()||'floraloasis0211@gmail.com';
 await db().transaction([
 {text:'INSERT INTO applications (id,name,email,phone,profession,stage,topic,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',params:[application,'WIN 一元金流測試',email,'TEST-NO-CONTACT','金流驗收測試','測試','NT$1 正式區測試，不包含課程報名',now]},
 {text:"INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source) VALUES ($1,$2,$3,$4,1,$5,$6,'pending',$7,$8,'win-test-1')",params:[id,application,orderNo,c.merchant,token,requestId,now,now]}]);
 return json({checkoutUrl:c.origin+'/api/payuni/checkout?token='+token,orderNo});
 }catch{return json({error:'測試建單失敗'},503)}
}
