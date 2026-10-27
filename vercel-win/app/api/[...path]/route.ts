const BACKEND='https://signature-speaker.elsaliao.chatgpt.site';
const PUBLIC='https://2027course.win-lin.com';
const ORIGINS=new Set([PUBLIC,'https://win-lecturer-20261018.vercel.app']);
const allowed=new Set(['payuni/create','payuni/checkout','payuni/status','payuni/notify','payuni/return','apply','premiere/register','premiere/attend']);
const guarded=new Set(['payuni/create','apply','premiere/register','premiere/attend']);
export const dynamic='force-dynamic';
export const maxDuration=30;
function accepts(path:string,origin:string){
 const origins=new Set(ORIGINS);
 if(path==='premiere/register'||path==='premiere/attend'){
  const key='PREMIERE_ALLOWED_ORIGINS';
  for(const item of (process.env[key]||'').split(',')){const value=item.trim();if(value)origins.add(value)}
 }
 return origins.has(origin);
}
async function proxy(request:Request,{params}:{params:Promise<{path:string[]}>}){
 const path=(await params).path.join('/');
 if(!allowed.has(path))return new Response('Not found',{status:404});
 if(request.method==='POST'&&guarded.has(path)&&!accepts(path,request.headers.get('origin')||''))return Response.json({error:'請從本頁送出報名。'},{status:403});
 const headers=new Headers();
 for(const key of ['content-type','accept']){const value=request.headers.get(key);if(value)headers.set(key,value)}
 headers.set('origin',BACKEND);headers.set('x-win-public-origin',PUBLIC);
 const url=new URL(request.url);
 try{
 const upstream=await fetch(BACKEND+'/api/'+path+url.search,{method:request.method,headers,body:request.method==='POST'?await request.arrayBuffer():undefined,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(25000)});
 const responseHeaders=new Headers({'Cache-Control':'no-store, max-age=0','Referrer-Policy':'no-referrer'});
 for(const key of ['content-type','content-security-policy']){const value=upstream.headers.get(key);if(value)responseHeaders.set(key,value)}
 const location=upstream.headers.get('location');if(location)responseHeaders.set('location',location.startsWith(BACKEND+'/')?PUBLIC+location.slice(BACKEND.length):location);
 return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
 }catch{return Response.json({error:'服務暫時無法連線，請稍後再試。'},{status:503,headers:{'Cache-Control':'no-store'}})}
}
export const GET=proxy;export const POST=proxy;
