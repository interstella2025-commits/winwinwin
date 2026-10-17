import { env } from 'cloudflare:workers';
import { timingSafeEqual } from 'node:crypto';
import { digest } from '../../../../../lib/payuni/core';
import { db,settings,json,orderBy } from '../../../../../lib/payuni/server';
export async function POST(request:Request){
 const secret=env.PAYUNI_TEST_ACCESS,header=request.headers.get('authorization');
 if(!secret||!header||!timingSafeEqual(Buffer.from(digest(header)),Buffer.from(digest('Bearer '+secret))))return json({error:'Not found'},404);
 try{const c=settings();const requestId=digest('win-test-1/'+secret);const old=await orderBy('request_id',requestId);if(old)return json({checkoutUrl:c.origin+'/api/payuni/checkout?token='+old.token,orderNo:old.order_no});
 const id=crypto.randomUUID(),application=crypto.randomUUID(),token=crypto.randomUUID(),now=new Date().toISOString(),orderNo='WINT'+Date.now().toString(36).toUpperCase()+crypto.randomUUID().replaceAll('-','').slice(0,8).toUpperCase();
 await db().batch([
 db().prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(application,'WIN 一元金流測試','floraloasis0211@gmail.com','TEST-NO-CONTACT','金流驗收測試','測試','NT$1 正式區測試，不包含課程報名',now),
 db().prepare("INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source) VALUES (?,?,?,?,1,?,?,'pending',?,?,'win-test-1')").bind(id,application,orderNo,c.merchant,token,requestId,now,now)]);
 return json({checkoutUrl:c.origin+'/api/payuni/checkout?token='+token,orderNo});
 }catch{return json({error:'測試建單失敗'},503)}
}
