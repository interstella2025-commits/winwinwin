// 說明會模板檢查：用記憶體儲存，不連資料庫、不寄信、不付款。
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
delete process.env.DATABASE_URL;
delete process.env.SEMINAR_STORE;
delete process.env.SEMINAR_CHECKOUT_ENABLED;
delete process.env.SEMINAR_EMAIL_ENABLED;
process.env.ADMIN_PASSWORD = 'unit-test-admin-password';
process.env.ADMIN_SESSION_SECRET = 'unit-test-admin-session-secret';
process.env.NODE_ENV = 'test';
process.env.VERCEL_ENV = 'preview';

const cache = {};
function resolveFile(from, name) {
  const base = name.startsWith('@/') ? path.join(root, name.slice(2)) : path.resolve(path.dirname(from), name);
  return base.endsWith('.ts') ? base : `${base}.ts`;
}
function load(file) {
  file = path.resolve(root, file);
  if (cache[file]) return cache[file].exports;
  const module = { exports: {} };
  cache[file] = module;
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name === '@neondatabase/serverless'
    ? { neon: () => { throw new Error('no real DB in tests'); } }
    : (name.startsWith('.') || name.startsWith('@/')) ? load(resolveFile(file, name))
      : require(name), module, module.exports);
  return module.exports;
}

const flags = load('lib/seminar/flags.ts');
const clock = load('lib/seminar/clock.ts');
const registry = load('lib/seminar/registry.ts');
const store = load('lib/seminar/store.ts');
const auth = load('lib/seminar/admin-auth.ts');
const checkout = load('lib/seminar/checkout.ts');
const leadRoute = load('app/api/seminar/[slug]/lead/route.ts');
const checkoutRoute = load('app/api/seminar/[slug]/checkout/route.ts');
const stateRoute = load('app/api/seminar/[slug]/state/route.ts');
const loginRoute = load('app/api/seminar-admin/login/route.ts');
const configRoute = load('app/api/seminar-admin/[slug]/config/route.ts');
const exportRoute = load('app/api/seminar-admin/[slug]/export/route.ts');

const ORIGIN = 'https://preview.example';
const ctx = slug => ({ params: Promise.resolve({ slug }) });
const postReq = (url, body, headers = {}) => new Request(ORIGIN + url, { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: JSON.stringify(body) });
let passes = 0;
async function test(name, fn) { await fn(); passes += 1; console.log('PASS', name); }

(async () => {
  await test('feature flag off: every route is 404', async () => {
    delete process.env.SEMINAR_TEMPLATE_ENABLED;
    const r = await stateRoute.GET(new Request(ORIGIN + '/api/seminar/template/state'), ctx('template'));
    assert.equal(r.status, 404);
    const l = await leadRoute.POST(postReq('/api/seminar/template/lead', {}), ctx('template'));
    assert.equal(l.status, 404);
    process.env.SEMINAR_TEMPLATE_ENABLED = '1';
  });

  await test('demo mode is never allowed in production', () => {
    assert.equal(flags.demoAllowed({ VERCEL_ENV: 'production' }), false);
    assert.equal(flags.demoAllowed({ VERCEL_ENV: 'preview' }), true);
  });

  await test('checkout stays off unless switch + database + keys', () => {
    assert.equal(flags.checkoutLive({}), false);
    assert.equal(flags.checkoutLive({ SEMINAR_CHECKOUT_ENABLED: '1', PAYUNI_MER_ID: 'x', PAYUNI_HASH_KEY: 'y', PAYUNI_HASH_IV: 'z' }), false);
    assert.equal(flags.testAmount({ SEMINAR_CARD_TEST_AMOUNT: '5' }), null);
    assert.equal(flags.testAmount({ SEMINAR_CARD_TEST_AMOUNT: '1' }), 1);
  });

  await test('demo timeline passes through all six states', () => {
    const cfg = registry.BUILTIN['win-lecturer'];
    const base = Math.floor(Date.now() / clock.DEMO_LOOP) * clock.DEMO_LOOP;
    const seen = new Set();
    for (let t = 0; t < clock.DEMO_LOOP; t += 1000) seen.add(clock.buildState(cfg, new Date(base + t), { demo: true, checkoutLive: false }).phase);
    assert.deepEqual([...seen].sort(), ['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
    for (const p of clock.PHASES) assert.equal(clock.buildState(cfg, new Date(), { demo: true, pin: p, checkoutLive: false }).phase, p);
  });

  await test('real timeline: offer before end, deadline never before end', () => {
    const cfg = structuredClone(registry.BUILTIN.template);
    cfg.schedule.startAt = '2026-12-01T20:00:00+08:00'; cfg.schedule.offerDeadline = '2026-11-01T00:00:00+08:00';
    const t = clock.realTimes(cfg);
    assert.ok(t.offer <= t.end); assert.equal(t.deadline, t.end);
    assert.equal(clock.phaseAt(t, t.start - 1), 'S1');
    assert.equal(clock.phaseAt(t, t.end + 1), 'S5');
  });

  await test('built-in configs have no internal placeholders, live-stream words or refund wording', () => {
    for (const cfg of Object.values(registry.BUILTIN)) assert.deepEqual(registry.publicCopyProblems(cfg), [], cfg.slug);
    const bad = structuredClone(registry.BUILTIN.template); bad.copy.subtitle = '【待確認】直播'; bad.messages.push({ id: 'x', at: 1, kind: 'feedback', name: 'a', body: 'b' });
    assert.equal(registry.publicCopyProblems(bad).length, 3);
  });

  await test('notifications only use Email or LINE; broadcasts need approval', () => {
    for (const cfg of Object.values(registry.BUILTIN)) for (const t of cfg.notify) {
      for (const c of t.channels) assert.ok(['email', 'line'].includes(c));
      if (t.offsetMinutes !== null) assert.equal(t.approved, false, t.id);
    }
  });

  await test('lead: needs consent, same origin, honeypot is silent', async () => {
    store.setStore(store.memoryStore());
    let r = await leadRoute.POST(postReq('/api/seminar/template/lead', { type: 'reminder', name: '王', email: 'a@b.co', channels: ['email'] }), ctx('template'));
    assert.equal(r.status, 400);
    r = await leadRoute.POST(new Request(ORIGIN + '/api/seminar/template/lead', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), ctx('template'));
    assert.equal(r.status, 403);
    r = await leadRoute.POST(postReq('/api/seminar/template/lead', { type: 'lead', website: 'bot' }), ctx('template'));
    assert.equal(r.status, 200);
    assert.equal((await store.store().list('template', 'lead')).length, 0);
    r = await leadRoute.POST(postReq('/api/seminar/template/lead', { type: 'reminder', name: '王小明', email: 'a@b.co', phone: '0912345678', channels: ['email', 'sms'], consent: true }), ctx('template'));
    assert.equal(r.status, 200);
    const rows = await store.store().list('template', 'lead');
    assert.equal(rows.length, 1); assert.deepEqual(rows[0].data.channels, ['email']);
  });

  await test('card checkout in preview never creates an order', async () => {
    const r = await checkoutRoute.POST(postReq('/api/seminar/win-lecturer/checkout', { name: '王小明', email: 'a@b.co', phone: '0912345678', consent: true }), ctx('win-lecturer'));
    assert.equal(r.status, 200); assert.equal((await r.json()).mode, 'preview');
    assert.equal((await store.store().list(null, 'order')).length, 0);
  });

  await test('order amount comes from server config or NT$1 test only', () => {
    const cfg = registry.BUILTIN['win-lecturer'];
    delete process.env.SEMINAR_CARD_TEST_AMOUNT;
    assert.equal(checkout.orderAmount(cfg), 39800);
    process.env.SEMINAR_CARD_TEST_AMOUNT = '1';
    assert.equal(checkout.orderAmount(cfg), 1);
    delete process.env.SEMINAR_CARD_TEST_AMOUNT;
  });

  await test('admin: wrong password rejected, owner cookie works, roles enforced', async () => {
    let r = await loginRoute.POST(postReq('/api/seminar-admin/login', { password: 'nope' }));
    assert.equal(r.status, 401);
    r = await loginRoute.POST(postReq('/api/seminar-admin/login', { password: 'unit-test-admin-password' }));
    assert.equal(r.status, 200);
    const cookie = r.headers.get('set-cookie').split(';')[0];
    assert.match(r.headers.get('set-cookie'), /HttpOnly/);
    const get = await configRoute.GET(new Request(ORIGIN + '/api/seminar-admin/template/config', { headers: { cookie } }), ctx('template'));
    assert.equal(get.status, 200);
    const editor = `${auth.COOKIE}=${encodeURIComponent(auth.sign({ role: 'manager', who: 'm', exp: Date.now() / 1000 + 60 }))}`;
    const cfg = (await get.json()).config;
    const priced = { ...cfg, cta: { ...cfg.cta, priceTwd: 1 } };
    const put = await configRoute.PUT(new Request(ORIGIN + '/api/seminar-admin/template/config', { method: 'PUT', headers: { cookie: editor, origin: ORIGIN }, body: JSON.stringify({ config: priced }) }), ctx('template'));
    assert.equal(put.status, 403);
    const copy = { ...cfg, copy: { ...cfg.copy, subtitle: '新的副標' } };
    const ok = await configRoute.PUT(new Request(ORIGIN + '/api/seminar-admin/template/config', { method: 'PUT', headers: { cookie: editor, origin: ORIGIN }, body: JSON.stringify({ config: copy }) }), ctx('template'));
    assert.equal(ok.status, 200);
    assert.equal((await registry.loadConfig('template')).copy.subtitle, '新的副標');
    const forged = await configRoute.GET(new Request(ORIGIN + '/x', { headers: { cookie: `${auth.COOKIE}=abc.def` } }), ctx('template'));
    assert.equal(forged.status, 401);
  });

  await test('lead export is masked for non-owner roles and guards formulas', async () => {
    const editor = `${auth.COOKIE}=${encodeURIComponent(auth.sign({ role: 'editor', who: 'e', exp: Date.now() / 1000 + 60 }))}`;
    await store.store().add('template', 'lead', { type: 'lead', name: '=HYPERLINK()', email: 'someone@example.com', phone: '0912345678', channels: ['email'], fields: {}, demo: false });
    const r = await exportRoute.GET(new Request(ORIGIN + '/api/seminar-admin/template/export', { headers: { cookie: editor } }), ctx('template'));
    const csv = await r.text();
    assert.equal(csv.includes('someone@example.com'), false);
    assert.equal(csv.includes('0912345678'), false);
    assert.match(csv, /"'=HYPERLINK\(\)"/);
  });

  await test('migration only creates the two seminar tables', () => {
    const sql = fs.readFileSync(path.join(root, 'db/migrations/0004_seminar.sql'), 'utf8');
    assert.equal(/\b(ALTER|DROP|DELETE|UPDATE|TRUNCATE)\b/i.test(sql), false);
    for (const name of ['applications', 'payment_orders', 'capi_events', 'site_events']) assert.equal(sql.includes(name), false);
  });

  await test('public seminar source never says 直播／首播／退費', () => {
    const files = [];
    const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(tsx?|css)$/.test(f.name)) files.push(p); } };
    walk(path.join(root, 'app/seminar')); walk(path.join(root, 'lib/seminar/projects'));
    for (const f of files) {
      const text = fs.readFileSync(f, 'utf8');
      assert.equal(/直播|首播|退費|退款|【待/.test(text), false, f);
    }
  });

  console.log(`${passes} seminar checks passed`);
})().catch(e => { console.error(e); process.exit(1); });
