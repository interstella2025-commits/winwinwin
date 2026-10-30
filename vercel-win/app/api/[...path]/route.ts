const BACKEND='https://signature-speaker.elsaliao.chatgpt.site';
const PUBLIC='https://2027course.win-lin.com';
const ORIGINS=new Set([PUBLIC,'https://win-lecturer-20261018.vercel.app']);
const allowed=new Set(['payuni/create','payuni/checkout','payuni/status','payuni/notify','payuni/return','apply','premiere/register','premiere/attend','premiere/messages']);
const guarded=new Set(['payuni/create','apply','premiere/register','premiere/attend','premiere/messages']);
export const dynamic='force-dynamic';
export const maxDuration=30;
function accepts(path:string,origin:string){
 const origins=new Set(ORIGINS);
 if(path==='premiere/register'||path==='premiere/attend'||path==='premiere/messages'){
  const key='PREMIERE_ALLOWED_ORIGINS';
  for(const item of (process.env[key]||'').split(',')){const value=item.trim();if(value)origins.add(value)}
 }
 return origins.has(origin);
}
function requestsFullcourse(body:ArrayBuffer|undefined){
 if(!body||!body.byteLength)return false;
 try{const data=JSON.parse(new TextDecoder().decode(body)) as {product?:unknown};return !!data&&typeof data==='object'&&data.product==='fullcourse'}catch{return false}
}
function checkoutToken(checkoutUrl:unknown){
 if(typeof checkoutUrl!=='string'||checkoutUrl.length>500)return '';
 try{const token=new URL(checkoutUrl,BACKEND).searchParams.get('token')||'';return /^[0-9a-f-]{36}$/i.test(token)?token:''}catch{return ''}
}
function closed(){return Response.json({error:'正式課程付款尚未開放'},{status:503,headers:{'Cache-Control':'no-store'}})}
async function confirmedFullcourse(token:string){
 const status=await fetch(BACKEND+'/api/payuni/status?token='+encodeURIComponent(token),{cache:'no-store',redirect:'manual',signal:AbortSignal.timeout(25000)});
 const payload=await status.json().catch(()=>null) as {amount?:unknown}|null;
 return status.ok&&!!payload&&payload.amount===39800;
}
async function proxy(request:Request,{params}:{params:Promise<{path:string[]}>}){
 const path=(await params).path.join('/');
 if(!allowed.has(path))return new Response('Not found',{status:404});
 if(request.method==='POST'&&guarded.has(path)&&!accepts(path,request.headers.get('origin')||''))return Response.json({error:'請從本頁送出報名。'},{status:403});
 const headers=new Headers();
 for(const key of ['content-type','accept']){const value=request.headers.get(key);if(value)headers.set(key,value)}
 if(path==='premiere/messages'){const authorization=request.headers.get('authorization');if(authorization)headers.set('authorization',authorization)}
 headers.set('origin',BACKEND);headers.set('x-win-public-origin',PUBLIC);
 const url=new URL(request.url);
 const rawBody=request.method==='POST'?await request.arrayBuffer():undefined;
 const fullcourse=path==='payuni/create'&&requestsFullcourse(rawBody);
 try{
 const upstream=await fetch(BACKEND+'/api/'+path+url.search,{method:request.method,headers,body:rawBody,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(25000)});
 const bytes=await upstream.arrayBuffer();
 if(fullcourse&&upstream.status===200){
  let payload:{checkoutUrl?:unknown}|null=null;
  try{payload=JSON.parse(new TextDecoder().decode(bytes))}catch{payload=null}
  const token=checkoutToken(payload?.checkoutUrl);
  if(!token)return closed();
  try{if(!await confirmedFullcourse(token))return closed()}catch{return closed()}
 }
 const responseHeaders=new Headers({'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'});
 for(const key of ['content-type','content-security-policy']){const value=upstream.headers.get(key);if(value)responseHeaders.set(key,value)}
 const location=upstream.headers.get('location');if(location)responseHeaders.set('location',location.startsWith(BACKEND+'/')?PUBLIC+location.slice(BACKEND.length):location);
 return new Response(bytes,{status:upstream.status,headers:responseHeaders});
 }catch{return Response.json({error:'服務暫時無法連線，請稍後再試。'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
export const GET=proxy;export const POST=proxy;
