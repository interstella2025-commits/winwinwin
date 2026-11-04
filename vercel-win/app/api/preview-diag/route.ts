import { first } from '../../../lib/payuni/db';
export const dynamic='force-dynamic';export const runtime='nodejs';
/** Preview-only readiness check. Returns booleans/lengths/hosts only, never secret values. 404 outside Preview. REMOVE BEFORE MERGE. */
export async function GET(){
 if(process.env.VERCEL_ENV!=='preview')return new Response('Not found',{status:404});
 const e=process.env,len=(k:string)=>e[k]?Buffer.byteLength(e[k]!.trim()):0;
 const out:Record<string,unknown>={merIdSet:!!e.PAYUNI_MER_ID?.trim(),hashKeyBytes:len('PAYUNI_HASH_KEY'),hashIvBytes:len('PAYUNI_HASH_IV'),endpointHost:new URL(e.PAYUNI_API_ENDPOINT?.trim()||'https://api.payuni.com.tw/api/upp').host,testAccessSet:!!e.PAYUNI_TEST_ACCESS,resendKeySet:!!e.RESEND_API_KEY,dbSet:!!e.DATABASE_URL};
 try{const r=await first<{a:string|null;o:string|null;l:string|null}>("SELECT to_regclass('public.applications')::text a,to_regclass('public.payment_orders')::text o,to_regclass('public.payment_rate_limits')::text l");out.tables=r}catch(x){out.tables='error:'+(x instanceof Error?x.message.slice(0,80):'')}
 if(e.RESEND_API_KEY){try{const r=await fetch('https://api.resend.com/domains',{headers:{Authorization:'Bearer '+e.RESEND_API_KEY},signal:AbortSignal.timeout(8000)});const j=await r.json() as {data?:{name:string;status:string;region?:string}[]};out.resend=r.ok?(j.data||[]).map(d=>({name:d.name,status:d.status,region:d.region})):'http '+r.status}catch{out.resend='error'}}
 return Response.json(out,{headers:{'Cache-Control':'no-store'}});
}
