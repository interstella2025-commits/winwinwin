const assert=require('node:assert/strict');const vm=require('node:vm');const ts=require('typescript');const fs=require('node:fs');
const code=ts.transpileModule(fs.readFileSync('app/api/[...path]/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const origin='https://win-lecturer-20261018.vercel.app';let calls=[];
const ctx={exports:{},Request,Response,Headers,URL,AbortSignal,fetch:async(url,options)=>{calls.push({url,options});return new Response('OK',{headers:{'content-type':'text/plain'}})}};vm.runInNewContext(code,ctx);
const params=path=>({params:Promise.resolve({path:path.split('/')})});
(async()=>{
assert.equal((await ctx.exports.POST(new Request(origin+'/api/payuni/create',{method:'POST',headers:{origin:'https://evil.example'}}),params('payuni/create'))).status,403);assert.equal(calls.length,0);
assert.equal((await ctx.exports.GET(new Request(origin+'/api/secret'),params('secret'))).status,404);assert.equal(calls.length,0);
const body='EncryptInfo=abcdef&HashInfo=signed&MerID=merchant';
let res=await ctx.exports.POST(new Request(origin+'/api/payuni/notify',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body}),params('payuni/notify'));
assert.equal(res.status,200);assert.equal(Buffer.from(calls[0].options.body).toString(),body);assert.equal(calls[0].options.redirect,'manual');assert.equal(calls[0].options.headers.get('x-win-public-origin'),origin);assert.equal(res.headers.get('cache-control'),'no-store, max-age=0');
ctx.fetch=async()=>new Response(null,{status:303,headers:{location:'https://signature-speaker.elsaliao.chatgpt.site/payment?token=test'}});
res=await ctx.exports.POST(new Request(origin+'/api/payuni/return',{method:'POST',body}),params('payuni/return'));assert.equal(res.headers.get('location'),origin+'/payment?token=test');
ctx.fetch=async()=>{throw new Error('network')};res=await ctx.exports.GET(new Request(origin+'/api/payuni/status?token=test'),params('payuni/status'));assert.equal(res.status,503);
console.log('PASS origin rejection, fixed route allowlist, signed callback body preservation, uncached status, return URL, network failure');
})().catch(e=>{console.error(e);process.exitCode=1});
