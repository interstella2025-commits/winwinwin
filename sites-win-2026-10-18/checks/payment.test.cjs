const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const {DatabaseSync}=require('node:sqlite');const sqlite=new DatabaseSync(':memory:');
for(const file of fs.readdirSync(path.join(__dirname,'../drizzle')).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(fs.readFileSync(path.join(__dirname,'../drizzle',file),'utf8'));
function prepared(sql,args=[]){const statement=sqlite.prepare(sql);return {bind:(...values)=>prepared(sql,values),first:async()=>statement.get(...args)||null,run:async()=>({success:true,meta:{changes:Number(statement.run(...args).changes)}})}}
const db={prepare:prepared,batch:async statements=>{sqlite.exec('BEGIN');try{for(const s of statements)await s.run();sqlite.exec('COMMIT')}catch(e){sqlite.exec('ROLLBACK');throw e}}};
const env={DB:db,PAYUNI_MER_ID:'WIN_TEST',PAYUNI_HASH_KEY:'12345678901234567890123456789012',PAYUNI_HASH_IV:'1234567890123456',PAYUNI_TEST_ACCESS:'test-admin-secret',RESEND_API_KEY:'mock',RESEND_FROM:'WIN <course@mail.example.test>'};
const cache={};function load(file){file=path.resolve(__dirname,'..',file);if(cache[file])return cache[file].exports;const module={exports:{}};cache[file]=module;const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;new Function('require','module','exports',code)(name=>name==='cloudflare:workers'?{env}:name.startsWith('.')?load(path.relative(path.resolve(__dirname,'..'),path.resolve(path.dirname(file),name.endsWith('.ts')?name:name+'.ts'))):require(name),module,module.exports);return module.exports}
const testCreate=load('app/api/payuni/test/create/route.ts');
const core=load('lib/payuni/core.ts'),create=load('app/api/payuni/create/route.ts'),notify=load('app/api/payuni/notify/route.ts'),returned=load('app/api/payuni/return/route.ts'),status=load('app/api/payuni/status/route.ts'),checkout=load('app/api/payuni/checkout/route.ts'),sessions=load('lib/course-sessions.ts');
const cfg=core.config(env),origin=cfg.origin;let sends=0,mailOK=true,lastEmail; 
global.fetch=async(url,options)=>{lastEmail=JSON.parse(options.body);sends++;return new Response(JSON.stringify({id:'mock-email'}),{status:mailOK?200:503})};
const valid={name:'測試 <script>',email:'test@example.test',phone:'QA',profession:'QA',stage:'QA',topic:'QA',sessionCode:'2026-11-15',lineName:'QA LINE',consent:true,requestId:crypto.randomUUID()};
function request(body,requestOrigin=origin){return new Request(origin+'/api/payuni/create',{method:'POST',headers:{Origin:requestOrigin,'Content-Type':'application/json','cf-connecting-ip':'192.0.2.1'},body:JSON.stringify(body)})}
function callback(values,hashOverride){const EncryptInfo=core.encrypt(values,cfg);return new Request(origin+'/api/payuni/notify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({MerID:cfg.merchant,Version:core.VERSION,EncryptInfo,HashInfo:hashOverride||core.hash(EncryptInfo,cfg)})})}
let passes=0;async function test(name,fn){await fn();passes++;console.log('PASS',name)}
(async()=>{
await test('missing/invalid configuration is refused',async()=>{assert.throws(()=>core.config({}));assert.throws(()=>core.config({...env,PAYUNI_HASH_KEY:'bad'}))});
await test('encryption round trip and tamper rejection',async()=>{const values={MerID:cfg.merchant,MerTradeNo:'WIN1',TradeAmt:399,TradeStatus:'1'};const e=core.encrypt(values,cfg);assert.deepEqual(core.decode({MerID:cfg.merchant,Version:core.VERSION,EncryptInfo:e,HashInfo:core.hash(e,cfg)},cfg),{...values,TradeAmt:'399'});assert.throws(()=>core.decode({MerID:cfg.merchant,Version:core.VERSION,EncryptInfo:e,HashInfo:'0'.repeat(64)},cfg))});
await test('required fields, email, consent, honeypot and origin rejected',async()=>{for(const body of [{...valid,sessionCode:'2099-01-01'},{...valid,sessionCode:''},{...valid,sessionCode:'2026-11-03'},{...valid,sessionCode:'2026-11-10'},{...valid,sessionCode:'2026-11-17'},{...valid,email:'bad'},{...valid,consent:false},{...valid,website:'bot'},{...valid,name:''}])assert.equal((await create.POST(request(body))).status,400);assert.equal((await create.POST(request(valid,'https://evil.example'))).status,403);assert.equal(sqlite.prepare('SELECT count(*) n FROM applications').get().n,0)});
let order;
await test('create stores application and server-fixed NT$399, no prepayment email',async()=>{const result=await create.POST(request({...valid,amount:1}));assert.equal(result.status,200);assert.match((await result.json()).checkoutUrl,/checkout\?token=/);order=sqlite.prepare('SELECT * FROM payment_orders').get();assert.equal(order.amount,399);const application=sqlite.prepare('SELECT * FROM applications WHERE id=?').get(order.application_id);assert.equal(application.session_code,valid.sessionCode);assert.equal(application.session_catalog,sessions.ACTIVE_SESSION_CATALOG);assert.equal(application.line_name,valid.lineName);assert.equal(sends,0)});
await test('repeated create reuses one order',async()=>{assert.equal((await create.POST(request(valid))).status,200);assert.equal(sqlite.prepare('SELECT count(*) n FROM payment_orders').get().n,1);assert.equal(sqlite.prepare('SELECT count(*) n FROM applications').get().n,1)});
await test('checkout exposes only signed encrypted gateway form',async()=>{const r=await checkout.GET(new Request(origin+'/api/payuni/checkout?token='+order.token));const html=await r.text();assert.equal(r.status,200);assert.ok(html.includes(cfg.endpoint));assert.ok(!html.includes(cfg.key));assert.ok(!html.includes(cfg.iv));assert.match(html,/NT\$399/)});
const paid={MerID:cfg.merchant,MerTradeNo:order.order_no,TradeAmt:399,TradeStatus:'1',TradeNo:'PROVIDER001'};
await test('browser return cannot mark order paid',async()=>{assert.equal((await returned.POST(callback(paid))).status,303);assert.equal(sqlite.prepare('SELECT status FROM payment_orders').get().status,'pending');assert.equal(sends,0)});
await test('forged notification and wrong amount rejected',async()=>{assert.equal((await notify.POST(callback(paid,'0'.repeat(64)))).status,400);assert.equal((await notify.POST(callback({...paid,TradeAmt:1}))).status,400);assert.equal(sqlite.prepare('SELECT status FROM payment_orders').get().status,'pending')});
await test('verified notify marks paid and sends exactly once',async()=>{assert.equal((await notify.POST(callback(paid))).status,200);assert.equal((await notify.POST(callback(paid))).status,200);assert.equal(sends,1);assert.match(lastEmail.text,/11 月 15 日（日） 20:00–21:30（台灣時間）/);assert.match(lastEmail.text,/暫定場次/);assert.match(lastEmail.text,/線上課程/);assert.doesNotMatch(lastEmail.text,/19:30/);assert.equal(sqlite.prepare('SELECT status FROM payment_orders').get().status,'paid');assert.equal(sqlite.prepare('SELECT email_status FROM payment_orders').get().email_status,'sent')});
await test('later failure does not downgrade paid order',async()=>{assert.equal((await notify.POST(callback({...paid,TradeStatus:'2'}))).status,200);assert.equal(sqlite.prepare('SELECT status FROM payment_orders').get().status,'paid');assert.equal(sends,1)});
await test('status is uncached and contains no applicant PII',async()=>{const r=await status.GET(new Request(origin+'/api/payuni/status?token='+order.token));assert.match(r.headers.get('Cache-Control'),/no-store/);const text=await r.text();assert.ok(!text.includes(valid.email));assert.ok(!text.includes(valid.phone));const body=JSON.parse(text);assert.equal(body.status,'paid');assert.equal(body.session,'2026 年 11 月 15 日（日） 20:00–21:30（台灣時間）')});
await test('email failure keeps paid data and callback retry recovers',async()=>{const data={...valid,requestId:crypto.randomUUID()};await create.POST(request(data));const second=sqlite.prepare('SELECT * FROM payment_orders WHERE id!=?').get(order.id);const values={...paid,MerTradeNo:second.order_no,TradeNo:'PROVIDER002'};mailOK=false;assert.equal((await notify.POST(callback(values))).status,503);assert.equal(sqlite.prepare('SELECT status FROM payment_orders WHERE id=?').get(second.id).status,'paid');mailOK=true;assert.equal((await notify.POST(callback(values))).status,200);assert.equal(sqlite.prepare('SELECT email_status FROM payment_orders WHERE id=?').get(second.id).email_status,'sent')});
await test('changed registration cannot silently reuse another payload',async()=>{const r=await create.POST(request({...valid,name:'Changed'}));assert.equal(r.status,409);assert.equal((await r.json()).resetRequest,true)});
await test('invalid receipt token does not expose order',async()=>{assert.equal((await status.GET(new Request(origin+'/api/payuni/status?token=bad'))).status,400);assert.equal((await status.GET(new Request(origin+'/api/payuni/status?token='+crypto.randomUUID()))).status,404)});
await test('one-dollar test is protected, idempotent, and independent of course price',async()=>{
assert.equal((await testCreate.POST(new Request(origin+'/api/payuni/test/create',{method:'POST'}))).status,404);
const req=()=>new Request(origin+'/api/payuni/test/create',{method:'POST',headers:{Authorization:'Bearer '+env.PAYUNI_TEST_ACCESS}});
const first=await testCreate.POST(req());assert.equal(first.status,200);const body=await first.json();assert.equal((await testCreate.POST(req())).status,200);
const testOrder=sqlite.prepare("SELECT * FROM payment_orders WHERE source='win-test-1'").get();assert.equal(testOrder.amount,1);assert.equal(core.AMOUNT,399);
const payment=await checkout.GET(new Request(body.checkoutUrl));assert.match(await payment.text(),/NT\$1/);
const values={MerID:cfg.merchant,MerTradeNo:testOrder.order_no,TradeAmt:1,TradeStatus:'1',TradeNo:'PROVIDERTEST001'};
assert.equal((await notify.POST(callback(values))).status,200);assert.match(lastEmail.subject,/測試/);assert.match(lastEmail.text,/不包含課程/);
assert.equal(sqlite.prepare("SELECT count(*) n FROM payment_orders WHERE source='win-test-1'").get().n,1);
});
await test('new sessions match frontend 917b802 and legacy rows stay readable',async()=>{
 assert.deepEqual(sessions.COURSE_SESSIONS.map(s=>({code:s.code,date:s.date,time:s.time})),[
  {code:'2026-11-15',date:'11 月 15 日（日）',time:'20:00–21:30'},
  {code:'2026-11-18',date:'11 月 18 日（三）',time:'12:00–13:30'},
  {code:'2026-11-21',date:'11 月 21 日（六）',time:'20:00–21:30'},
  {code:'2026-11-24',date:'11 月 24 日（二）',time:'12:00–13:30'},
  {code:'2026-11-27',date:'11 月 27 日（五）',time:'20:00–21:30'},
  {code:'2026-11-30',date:'11 月 30 日（一）',time:'12:00–13:30'}
 ]);
 const page=fs.readFileSync(path.join(__dirname,'../app/page.tsx'),'utf8');
 assert.ok(page.includes('COURSE_SESSIONS.map'));assert.ok(!page.includes('2026-11-03'));assert.ok(!page.includes('19:30'));
 const expected={
  '2026-11-15':'2026 年 11 月 15 日（日） 20:00–21:30（台灣時間）',
  '2026-11-18':'2026 年 11 月 18 日（三） 12:00–13:30（台灣時間）',
  '2026-11-21':'2026 年 11 月 21 日（六） 20:00–21:30（台灣時間）',
  '2026-11-24':'2026 年 11 月 24 日（二） 12:00–13:30（台灣時間）',
  '2026-11-27':'2026 年 11 月 27 日（五） 20:00–21:30（台灣時間）',
  '2026-11-30':'2026 年 11 月 30 日（一） 12:00–13:30（台灣時間）'
 };
 const legacyExpected={
  '2026-11-03':'2026 年 11 月 3 日（二） 19:30–21:00（暫定，台灣時間）',
  '2026-11-10':'2026 年 11 月 10 日（二） 19:30–21:00（暫定，台灣時間）',
  '2026-11-17':'2026 年 11 月 17 日（二） 19:30–21:00（暫定，台灣時間）',
  '2026-11-24':'2026 年 11 月 24 日（二） 19:30–21:00（暫定，台灣時間）'
 };
 for(const [code,label] of Object.entries(expected)){assert.equal(sessions.sessionLabel(code,sessions.ACTIVE_SESSION_CATALOG),label);assert.doesNotThrow(()=>core.validate({...valid,sessionCode:code,requestId:crypto.randomUUID()}))}
 for(const [code,label] of Object.entries(legacyExpected))assert.equal(sessions.sessionLabel(code,null),label);
 for(const code of ['2026-11-03','2026-11-10','2026-11-17'])assert.throws(()=>core.validate({...valid,sessionCode:code,requestId:crypto.randomUUID()}));
 assert.equal(sessions.sessionLabel('2026-11-24','other'),legacyExpected['2026-11-24']);
 assert.equal(sessions.sessionLabel('2026-11-24'),legacyExpected['2026-11-24']);
 assert.equal(sessions.sessionLabel(null),null);
 function legacyOrder(code){const id=crypto.randomUUID(),application=crypto.randomUUID(),token=crypto.randomUUID(),orderNo='WINL'+code.replaceAll('-','')+crypto.randomUUID().replaceAll('-','').slice(0,6).toUpperCase(),created='2026-10-18T02:00:00.000Z';
  sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run(application,'舊報名','legacy@example.test','0900000000','QA','QA','QA',code,'',created);
  sqlite.prepare("INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source) VALUES (?,?,?,?,?,?,?,'pending',?,?,?)").run(id,application,orderNo,cfg.merchant,399,token,crypto.randomUUID(),created,created,origin+'/#apply');
  return {token,orderNo};}
 const stored={};
 for(const code of Object.keys(legacyExpected))stored[code]=legacyOrder(code);
 for(const [code,row] of Object.entries(stored)){const text=await (await status.GET(new Request(origin+'/api/payuni/status?token='+row.token))).text();assert.equal(JSON.parse(text).session,legacyExpected[code])}
 const fresh=request({...valid,sessionCode:'2026-11-24',requestId:crypto.randomUUID()});fresh.headers.set('cf-connecting-ip','192.0.2.24');
 const created=await create.POST(fresh);assert.equal(created.status,200);const checkoutUrl=(await created.json()).checkoutUrl;const token=new URL(checkoutUrl,origin).searchParams.get('token');
 const current=sqlite.prepare('SELECT * FROM applications WHERE session_code=? AND session_catalog=?').get('2026-11-24',sessions.ACTIVE_SESSION_CATALOG);assert.equal(current.session_code,'2026-11-24');
 const currentStatus=JSON.parse(await (await status.GET(new Request(origin+'/api/payuni/status?token='+token))).text());assert.equal(currentStatus.session,expected['2026-11-24']);
 const legacyStatus=JSON.parse(await (await status.GET(new Request(origin+'/api/payuni/status?token='+stored['2026-11-24'].token))).text());assert.equal(legacyStatus.session,legacyExpected['2026-11-24']);
 const before=sends;
 assert.equal((await notify.POST(callback({MerID:cfg.merchant,MerTradeNo:stored['2026-11-03'].orderNo,TradeAmt:399,TradeStatus:'1',TradeNo:'LEGACY1103'}))).status,200);assert.match(lastEmail.text,/11 月 3 日（二） 19:30–21:00（暫定，台灣時間）/);assert.doesNotMatch(lastEmail.text,/12:00/);
 assert.equal((await notify.POST(callback({MerID:cfg.merchant,MerTradeNo:stored['2026-11-24'].orderNo,TradeAmt:399,TradeStatus:'1',TradeNo:'LEGACY1124'}))).status,200);assert.match(lastEmail.text,/11 月 24 日（二） 19:30–21:00（暫定，台灣時間）/);assert.doesNotMatch(lastEmail.text,/12:00/);
 const currentOrder=sqlite.prepare('SELECT * FROM payment_orders WHERE token=?').get(token);
 assert.equal((await notify.POST(callback({MerID:cfg.merchant,MerTradeNo:currentOrder.order_no,TradeAmt:399,TradeStatus:'1',TradeNo:'CURRENT1124'}))).status,200);assert.match(lastEmail.text,/11 月 24 日（二） 12:00–13:30（台灣時間）/);assert.doesNotMatch(lastEmail.text,/19:30/);
 assert.equal(sends,before+3);
 const exported=sqlite.prepare('SELECT session_code AS code, session_catalog AS catalog FROM applications').all().map(row=>sessions.describeStoredSession(row.code,row.catalog));
 const nov24=exported.filter(row=>row.code==='2026-11-24');
 assert.equal(nov24.length,2);
 assert.ok(nov24.some(row=>row.legacy&&row.catalog===null&&row.label===legacyExpected['2026-11-24']));
 assert.ok(nov24.some(row=>row.legacy===false&&row.catalog===sessions.ACTIVE_SESSION_CATALOG&&row.label===expected['2026-11-24']&&row.selectable===true));
 for(const code of ['2026-11-03','2026-11-10','2026-11-17']){const row=exported.find(item=>item.code===code);assert.equal(row.legacy,true);assert.equal(row.selectable,false);assert.equal(row.label,legacyExpected[code])}
});
await test('per-minute checkout rate limit enforced',async()=>{let limited=false;for(let i=0;i<6;i++){const r=await create.POST(request({...valid,requestId:crypto.randomUUID()}));if(r.status===429)limited=true}assert.ok(limited)});
console.log(`${passes} payment checks passed; mock credentials, in-memory database, no real payments or emails.`);
})().catch(e=>{console.error(e);process.exitCode=1});
