// Admin dashboard checks use in-memory SQLite. No network, no real password, no DATABASE_URL.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const sqlite = new DatabaseSync(':memory:');
sqlite.exec(fs.readFileSync(path.join(root, 'db/migrations/0001_init.sql'), 'utf8'));
sqlite.exec(fs.readFileSync(path.join(root, 'db/migrations/0003_site_analytics.sql'), 'utf8'));
const conv = text => text.replace(/\$(\d+)/g, '?$1');
const run = (text, params = []) => {
  const statement = sqlite.prepare(conv(text));
  return /^\s*(SELECT|INSERT[\s\S]*RETURNING|UPDATE[\s\S]*RETURNING)/i.test(text) ? statement.all(...params) : (statement.run(...params), []);
};
const memdb = {
  query: async (text, params) => run(text, params),
  transaction: async statements => {
    sqlite.exec('BEGIN');
    try {
      for (const statement of statements) run(statement.text, statement.params);
      sqlite.exec('COMMIT');
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  },
};
delete process.env.DATABASE_URL;
delete process.env.ADMIN_DASHBOARD_FIXTURE;
process.env.ADMIN_PASSWORD = 'unit-test-admin-password';
process.env.ADMIN_SESSION_SECRET = 'unit-test-admin-session-secret';
process.env.NODE_ENV = 'test';

const cache = {};
function load(file) {
  file = path.resolve(root, file);
  if (cache[file]) return cache[file].exports;
  const module = { exports: {} };
  cache[file] = module;
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', code)(name => name === '@neondatabase/serverless'
    ? { neon: () => { throw new Error('no real DB in tests'); } }
    : name.startsWith('.') ? load(path.resolve(path.dirname(file), name.endsWith('.ts') ? name : `${name}.ts`))
    : require(name), module, module.exports);
  return module.exports;
}
load('lib/payuni/db.ts').setDatabase(memdb);
const offers = load('lib/admin/offers.ts');
const tracking = load('lib/admin/tracking.ts');
const ingest = load('lib/admin/ingest.ts');
const report = load('lib/admin/report.ts');
const auth = load('lib/admin/auth.ts');
const login = load('app/api/admin/login/route.ts');
const overview = load('app/api/admin/overview/route.ts');
const eventsRoute = load('app/api/analytics/events/route.ts');

const ONLINE = '線上課|2026-12-06（日）|20:00–21:30';
const DAY16 = '實體課（台北場），2026 年 12 月 16 日（三）13:00–14:30（台灣時間）';
const DAY23 = '實體課（台北場），2026 年 12 月 23 日（三）13:00–16:00（台灣時間）';
const DAY2 = '實體課（台北場），2026 年 12 月 2 日（三）13:00–14:30（台灣時間）';
const order = (patch) => ({ orderNo: 'WIN1', amount: 399, status: 'paid', source: 'https://2027course.win-lin.com/#apply', paidAt: '2026-11-18T00:00:00.000Z', createdAt: '2026-11-18T00:00:00.000Z', ...patch });
let passes = 0;
async function test(name, fn) {
  await fn();
  passes += 1;
  console.log('PASS', name);
}

(async () => {
  await test('migration only adds analytics tables', () => {
    const sql = fs.readFileSync(path.join(root, 'db/migrations/0003_site_analytics.sql'), 'utf8');
    assert.equal(/\b(ALTER|DROP|DELETE|UPDATE|TRUNCATE)\b/i.test(sql), false);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS site_sessions/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS site_events/);
    assert.match(sql, /CREATE TABLE IF NOT EXISTS site_ingest_limits/);
    for (const name of ['applications', 'payment_orders', 'payment_rate_limits', 'capi_events']) assert.equal(sql.includes(name), false);
  });

  await test('free online and paid in-person are counted apart', () => {
    assert.equal(offers.classifyApplication(ONLINE, []).freeOnline, true);
    assert.equal(offers.classifyApplication(ONLINE, [order({ status: 'pending', paidAt: null })]).freeOnline, false);
    assert.equal(offers.classifyApplication(ONLINE, [order({ status: 'pending', paidAt: null })]).onlineAbandoned, true);
    assert.equal(offers.classifyApplication(ONLINE, [order()]).onlinePaid, true);
    assert.equal(offers.classifyApplication(ONLINE, [order()]).freeOnline, false);
    assert.equal(offers.classifyApplication('2026-11-15', []).offer, 'online');
    assert.equal(offers.classifyApplication('notify', []).notify, true);
    assert.equal(offers.classifyApplication('notify', []).freeOnline, false);
    const paid16 = offers.classifyApplication(DAY16, [order()]);
    assert.equal(paid16.inpersonPaid, true);
    assert.equal(paid16.freeOnline, false);
    assert.equal(offers.isDecember16(DAY16), true);
    assert.equal(offers.isDecember16(DAY2), false);
    assert.equal(offers.isDecember16(DAY23), false);
    assert.equal(offers.isDecember23(DAY23), true);
    assert.equal(offers.isDecember23(DAY16), false);
    assert.equal(offers.classifyApplication(DAY23, [order()]).inpersonPaid, true);
    assert.equal(offers.classifyApplication(DAY16, [order({ status: 'pending', paidAt: null })]).inpersonStarted, true);
    assert.equal(offers.classifyApplication(DAY16, [order({ status: 'pending', paidAt: null })]).inpersonPaid, false);
    assert.equal(offers.classifyApplication(DAY16, [order({ amount: 1, source: 'win-test-1' })]).inpersonPaid, false);
    assert.equal(offers.classifyApplication(DAY16, [order({ source: 'win-test-1' })]).result, '測試單');
    assert.equal(offers.classifyApplication(ONLINE, [order({ amount: 1, source: 'win-test-1' })]).freeOnline, false);
  });

  await test('tracking classifies the current and the free-online response shapes', () => {
    assert.equal(tracking.offerFromForm('online', ONLINE), 'online');
    assert.equal(tracking.offerFromForm('inperson', DAY16), 'inperson');
    assert.equal(tracking.offerFromForm('', 'notify'), 'notify');
    assert.equal(tracking.outcomeKind('/api/payuni/create', { checkoutUrl: 'https://2027course.win-lin.com/api/payuni/checkout?token=abc' }), 'payment_start');
    assert.equal(tracking.outcomeKind('/api/apply', { ok: true }), 'registered');
    assert.equal(tracking.outcomeKind('/api/notify-signup', { ok: true }), 'registered');
    assert.equal(tracking.outcomeKind('/api/free-signup', { ok: true }), 'registered');
    assert.equal(tracking.outcomeKind('/api/payuni/status', { status: 'paid' }), null);
    assert.equal(tracking.outcomeKind('/api/payuni/create', { error: '暫時無法建立付款' }), null);
  });

  await test('report keeps historical paid online out of the free total', () => {
    const now = '2026-11-18T10:00:00.000Z';
    const built = report.buildReport({
      days: 7,
      since: '2026-11-11T10:00:00.000Z',
      analyticsUnavailable: false,
      registrationsUnavailable: false,
      fixture: false,
      sessions: [
        { id: 's1', visitor_id: 'v1', started_at: now, last_seen_at: '2026-11-18T10:01:30.000Z', referrer: null, device_type: 'mobile', utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'win', utm_content: null, utm_term: null, max_scroll_depth: 50, last_stage: 'page_view' },
        { id: 's2', visitor_id: 'v2', started_at: now, last_seen_at: now, referrer: 'https://line.me', device_type: 'desktop', utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, max_scroll_depth: 25, last_stage: 'page_view' },
      ],
      events: [
        { session_id: 's1', event_name: 'cta_click', offer: null, event_data: '{}', occurred_at: now },
        { session_id: 's1', event_name: 'form_start', offer: 'online', event_data: '{}', occurred_at: now },
        { session_id: 's1', event_name: 'form_submit_ok', offer: 'online', event_data: '{}', occurred_at: now },
        { session_id: 's1', event_name: 'session_end', offer: null, event_data: JSON.stringify({ durationSeconds: 90 }), occurred_at: now },
      ],
      applications: [
        { id: 'free', name: '免費', email: 'free@example.test', phone: '+886900000001', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'old', name: '舊線上', email: 'old@example.test', phone: '+886900000002', sessionCode: ONLINE, createdAt: now, orders: [order()] },
        { id: 'place', name: '實體', email: 'place@example.test', phone: '+886900000003', sessionCode: DAY16, createdAt: now, orders: [order({ orderNo: 'WIN1216' })] },
        { id: 'place23', name: '實體二', email: 'place23@example.test', phone: '+886900000005', sessionCode: DAY23, createdAt: now, orders: [order({ orderNo: 'WIN1223' })] },
        { id: 'note', name: '通知', email: 'note@example.test', phone: '+886900000004', sessionCode: 'notify', createdAt: now, orders: [] },
      ],
    });
    assert.equal(built.kpis.freeOnline, 1);
    assert.equal(built.kpis.onlinePaid, 1);
    assert.equal(built.kpis.inpersonPaid, 2);
    assert.equal(built.kpis.inpersonPaid1216, 1);
    assert.equal(built.kpis.inpersonPaid1223, 1);
    assert.equal(built.kpis.inpersonPaidAmount, 798);
    assert.equal(built.kpis.notify, 1);
    assert.equal(built.funnels.online.at(-1).count, 1);
    assert.equal(built.funnels.inperson.at(-1).count, 2);
    assert.equal(built.sources[0].label, 'facebook / paid');
    assert.equal(built.sources.some(source => source.label === 'line.me'), true);
    assert.equal(built.kpis.averageDwellSeconds >= 45, true);
  });

  await test('ingest stores source data and drops contact fields', async () => {
    const now = new Date().toISOString();
    const body = {
      visitorId: '11111111-1111-4111-8111-111111111111',
      sessionId: '22222222-2222-4222-8222-222222222222',
      startedAt: now,
      landingUrl: 'https://2027course.win-lin.com/?utm_source=newsletter&email=person@example.test',
      referrer: 'https://facebook.com/groups/private?token=secret',
      viewportWidth: 390,
      events: [{ name: 'page_view', occurredAt: now, pagePath: '/', sectionId: 'page', data: { email: 'person@example.test', depth: 10, durationSeconds: 3 } }],
    };
    const response = await eventsRoute.POST(new Request('https://2027course.win-lin.com/api/analytics/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (iPhone)', 'x-real-ip': '203.0.113.10' },
      body: JSON.stringify(body),
    }));
    assert.equal(response.status, 200);
    const session = sqlite.prepare('SELECT * FROM site_sessions').get();
    assert.equal(session.utm_source, 'newsletter');
    assert.equal(session.referrer, 'https://facebook.com');
    assert.equal(session.landing_url.includes('email='), false);
    assert.equal(session.device_type, 'mobile');
    assert.equal(session.ip_hash.includes('203.0.113.10'), false);
    const event = sqlite.prepare('SELECT event_data FROM site_events').get();
    assert.equal(event.event_data.includes('person@example.test'), false);
    assert.equal(JSON.parse(event.event_data).depth, 10);
    const again = ingest.parseIngest(JSON.stringify({ ...body, landingUrl: 'https://2027course.win-lin.com/?utm_source=other', events: [{ name: 'scroll_depth', occurredAt: now, pagePath: '/', data: { depth: 75 } }] }), 'desktop', Date.parse(now));
    assert.equal(again.ok, true);
    await ingest.recordIngest(again.value, 'a'.repeat(64), Date.parse(now));
    const kept = sqlite.prepare('SELECT utm_source, max_scroll_depth FROM site_sessions').get();
    assert.equal(kept.utm_source, 'newsletter');
    assert.equal(kept.max_scroll_depth, 75);
  });

  await test('ingest rejects admin paths, unknown events and oversized bodies', () => {
    const now = new Date().toISOString();
    const base = { visitorId: '11111111-1111-4111-8111-111111111111', sessionId: '33333333-3333-4333-8333-333333333333', startedAt: now, landingUrl: 'https://2027course.win-lin.com/', viewportWidth: 1200, events: [{ name: 'page_view', occurredAt: now, pagePath: '/' }] };
    assert.equal(ingest.parseIngest(JSON.stringify({ ...base, landingUrl: 'https://2027course.win-lin.com/admin' }), '').ok, false);
    assert.equal(ingest.parseIngest(JSON.stringify({ ...base, events: [{ name: 'purchase', occurredAt: now, pagePath: '/' }] }), '').ok, false);
    assert.equal(ingest.parseIngest('x'.repeat(20001), '').status, 413);
  });

  await test('admin password and session are required', async () => {
    assert.equal(auth.verifyAdminPassword('unit-test-admin-password'), true);
    assert.equal(auth.verifyAdminPassword('nope'), false);
    assert.equal(auth.verifyAdminSessionToken(auth.issueAdminSession(Math.floor(Date.now() / 1000) - 30)), false);
    assert.equal(auth.verifyAdminSessionToken(`${auth.createAdminSessionToken()}x`), false);
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    assert.equal((await login.POST(new Request('https://2027course.win-lin.com/api/admin/login', { method: 'POST', body: JSON.stringify({ password: saved }) }))).status, 503);
    process.env.ADMIN_PASSWORD = saved;
    assert.equal((await login.POST(new Request('https://2027course.win-lin.com/api/admin/login', { method: 'POST', body: JSON.stringify({ password: 'wrong' }) }))).status, 401);
    const ok = await login.POST(new Request('https://2027course.win-lin.com/api/admin/login', { method: 'POST', body: JSON.stringify({ password: saved }) }));
    assert.equal(ok.status, 200);
    const setCookie = ok.headers.get('set-cookie') || '';
    assert.match(setCookie, /win_admin_session=/);
    assert.match(setCookie, /HttpOnly/i);
    const token = setCookie.split(';')[0].split('=').slice(1).join('=');
    const denied = await overview.GET(new Request('https://2027course.win-lin.com/api/admin/overview'));
    assert.equal(denied.status, 401);
    assert.equal((await denied.text()).includes('free@example.test'), false);
    const created = new Date().toISOString();
    sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('app-free', '免費', 'free@example.test', '+886900000001', 'QA', 'QA', 'QA', ONLINE, '', created);
    sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('app-place', '實體', 'place@example.test', '+886900000003', 'QA', 'QA', 'QA', DAY16, '', created);
    sqlite.prepare('INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source,paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('order-16', 'app-place', 'WIN1216', 'M', 399, 'token-16', 'request-16', 'paid', created, created, 'https://2027course.win-lin.com/#apply', created);
    const allowed = await overview.GET(new Request('https://2027course.win-lin.com/api/admin/overview', { headers: { cookie: `win_admin_session=${token}` } }));
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.kpis.freeOnline, 1);
    assert.equal(body.kpis.inpersonPaid, 1);
    assert.equal(body.kpis.inpersonPaid1216, 1);
    assert.equal(body.registrations.some(row => row.email === 'free@example.test' && row.result === '免費登記'), true);
  });

  await test('public page markup is unchanged and admin is noindex', () => {
    const page = fs.readFileSync(path.join(root, 'app/page.tsx'), 'utf8');
    assert.equal(page.includes('SiteAnalytics'), false);
    assert.equal(page.includes('win_analytics'), false);
    const chrome = fs.readFileSync(path.join(root, 'components/public-chrome.tsx'), 'utf8');
    assert.match(chrome, /href="https:\/\/line\.me\/R\/ti\/p\/%40dmd9019a"/);
    assert.match(chrome, /aria-label="專人協助，透過 LINE 聯絡我們（另開視窗）"/);
    assert.match(chrome, /pathname\.startsWith\('\/admin'\)\) return null/);
    const layout = fs.readFileSync(path.join(root, 'app/admin/layout.tsx'), 'utf8');
    assert.match(layout, /index: false/);
    const example = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
    assert.match(example, /^ADMIN_PASSWORD=\s*$/m);
    assert.match(example, /^ADMIN_SESSION_SECRET=\s*$/m);
    assert.equal(fs.readFileSync(path.join(root, 'lib/admin/auth.ts'), 'utf8').includes('unit-test-admin-password'), false);
  });



  await test('funnel maps real events and stays monotonically non-increasing', () => {
    const now = '2026-11-18T10:00:00.000Z';
    const session = (id, visitor) => ({ id, visitor_id: visitor, started_at: now, last_seen_at: now, referrer: null, device_type: 'mobile', utm_source: null, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null, max_scroll_depth: 40, last_stage: 'page_view' });
    const ev = (session_id, event_name, offer) => ({ session_id, event_name, offer, event_data: '{}', occurred_at: now });
    const built = report.buildReport({
      days: 7,
      since: '2026-11-11T10:00:00.000Z',
      analyticsUnavailable: false,
      registrationsUnavailable: false,
      fixture: false,
      sessions: [session('s1', 'v1'), session('s2', 'v2'), session('s3', 'v3')],
      events: [
        ev('s1', 'cta_click', null),
        ev('s1', 'form_start', 'unknown'),
        ev('s1', 'form_submit', 'online'),
        ev('s2', 'form_start', 'inperson'),
        ev('s2', 'form_submit', 'inperson'),
        ev('s2', 'payment_start', 'inperson'),
      ],
      applications: [
        { id: 'free1', name: '完成一', email: 'a@example.test', phone: '+886900000001', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'free2', name: '完成二', email: 'b@example.test', phone: '+886900000002', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'free3', name: '完成三', email: 'c@example.test', phone: '+886900000003', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'place', name: '實體', email: 'd@example.test', phone: '+886900000004', sessionCode: DAY16, createdAt: now, orders: [order({ orderNo: 'WIN1216' })] },
        { id: 'hidden', name: 'Elsa', email: 'hidden@example.test', phone: '+886900000005', sessionCode: ONLINE, createdAt: now, orders: [] },
      ],
    });
    const online = built.funnels.online.map(step => step.count);
    const inperson = built.funnels.inperson.map(step => step.count);
    assert.equal(built.kpis.freeOnline, 3);
    assert.equal(built.funnels.online.at(-1).count, 3);
    assert.equal(built.funnels.online[2].count >= 3, true);
    assert.equal(built.funnels.online[3].count >= 3, true);
    for (let i = 1; i < online.length; i++) assert.equal(online[i] <= online[i - 1], true, 'online step '+i);
    for (let i = 1; i < inperson.length; i++) assert.equal(inperson[i] <= inperson[i - 1], true, 'inperson step '+i);
    assert.equal(built.eventCounts.some(row => row.key === 'form_submit' && row.count === 2), true);
    assert.equal(built.registrations.some(row => row.name === 'Elsa'), false);
  });

  await test('test names are excluded for Elsa and 廖子淇 with any case or spacing', () => {
    const names = load('lib/admin/test-registrations.ts');
    assert.equal(names.isExcludedTestName('elsa測試'), true);
    assert.equal(names.isExcludedTestName(' 廖子淇 '), true);
    assert.equal(names.isExcludedTestName('廖子淇'), true);
    assert.equal(names.isExcludedTestName('Elsa'), true);
    assert.equal(names.isExcludedTestName(' elsa '), true);
    assert.equal(names.isExcludedTestName('ELSA'), true);
    assert.equal(names.isExcludedTestName('Elsa的朋友'), false);
    assert.equal(names.isExcludedTestName('廖'), false);
    assert.equal(names.isExcludedTestName('廖子淇的朋友'), false);
    assert.equal(names.isExcludedTestName('elsa測試帳號'), false);
    assert.equal(names.isExcludedTestName('陳安'), false);
    process.env.ADMIN_EXCLUDED_TEST_NAMES = ' 王測試 ,李示範';
    assert.equal(names.isExcludedTestName('王測試'), true);
    assert.equal(names.isExcludedTestName('李示範'), true);
    assert.equal(names.isExcludedTestName('elsa測試'), true);
    delete process.env.ADMIN_EXCLUDED_TEST_NAMES;
  });

  await test('report subtracts exact test-name rows from stats and lists', () => {
    const now = '2026-11-18T10:00:00.000Z';
    const base = {
      days: 7,
      since: '2026-11-11T10:00:00.000Z',
      analyticsUnavailable: false,
      registrationsUnavailable: false,
      fixture: false,
      sessions: [
        { id: 's1', visitor_id: 'v1', started_at: now, last_seen_at: '2026-11-18T10:01:30.000Z', referrer: null, device_type: 'mobile', utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'win', utm_content: null, utm_term: null, max_scroll_depth: 50, last_stage: 'page_view' },
      ],
      events: [
        { session_id: 's1', event_name: 'page_view', offer: null, event_data: '{}', occurred_at: now },
        { session_id: 's1', event_name: 'form_start', offer: 'online', event_data: '{}', occurred_at: now },
      ],
      applications: [
        { id: 'free', name: '免費', email: 'free@example.test', phone: '+886900000001', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'place', name: '實體', email: 'place@example.test', phone: '+886900000003', sessionCode: DAY16, createdAt: now, orders: [order({ orderNo: 'WIN1216' })] },
      ],
    };
    const before = report.buildReport(base);
    const after = report.buildReport({
      ...base,
      applications: [
        ...base.applications,
        { id: 'elsa', name: 'elsa測試', email: 'elsa@example.test', phone: '+886900000091', sessionCode: ONLINE, createdAt: now, orders: [] },
        { id: 'elsa2', name: ' Elsa ', email: 'elsa.case@example.test', phone: '+886900000094', sessionCode: DAY16, createdAt: now, orders: [order({ orderNo: 'WINMWL2WRYP316798C958', status: 'pending', paidAt: null })] },
        { id: 'liao', name: ' 廖子淇 ', email: 'liao@example.test', phone: '+886900000092', sessionCode: DAY16, createdAt: now, orders: [order({ orderNo: 'WINLIAO' })] },
        { id: 'friend', name: '廖子淇的朋友', email: 'friend@example.test', phone: '+886900000093', sessionCode: ONLINE, createdAt: now, orders: [] },
      ],
    });
    assert.equal(before.kpis.freeOnline, 1);
    assert.equal(before.kpis.inpersonPaid, 1);
    assert.equal(before.kpis.inpersonPaidAmount, 399);
    assert.equal(after.kpis.freeOnline, 2);
    assert.equal(after.kpis.inpersonPaid, 1);
    assert.equal(after.kpis.inpersonPaidAmount, 399);
    assert.equal(after.kpis.inpersonStarted, 1);
    assert.equal(after.kpis.excludedTestNames, 3);
    assert.equal(after.funnels.online.at(-1).count, 2);
    assert.equal(after.funnels.inperson.at(-1).count, 1);
    assert.equal(after.registrations.some(row => /elsa/i.test(row.name.trim()) || row.name.trim() === '廖子淇'), false);
    assert.equal(after.registrations.some(row => row.name === '廖子淇的朋友' && row.result === '免費登記'), true);
    assert.equal(after.payments.some(row => row.orderNo === 'WINLIAO' || row.orderNo === 'WINMWL2WRYP316798C958' || row.name.trim() === '廖子淇' || row.name.trim() === 'Elsa'), false);
    assert.equal(after.payments.some(row => row.orderNo === 'WIN1216'), true);
    assert.equal(after.excludedTests.some(row => row.name.trim() === 'Elsa' && row.orders.some(order => order.orderNo === 'WINMWL2WRYP316798C958')), true);
    assert.equal(after.excludedTests.map(row => row.name.trim()).sort().join(','), 'Elsa,elsa測試,廖子淇');
    const csv = load('lib/admin/test-registrations.ts').excludedTestRegistrationsCsv(after.excludedTests);
    assert.match(csv, /elsa測試/);
    assert.match(csv, /廖子淇/);
    assert.equal(csv.includes('廖子淇的朋友'), false);
  });

  await test('fixture hides default test names and still counts a similar real name', () => {
    const sample = load('lib/admin/fixture.ts').fixtureReport(7, Date.parse('2026-11-21T04:00:00.000Z'));
    assert.equal(sample.fixture, true);
    assert.equal(sample.kpis.excludedTestNames, 2);
    assert.equal(sample.registrations.some(row => row.name.trim() === 'elsa測試' || row.name.trim() === '廖子淇'), false);
    assert.equal(sample.registrations.some(row => row.name === '廖子淇的朋友'), true);
    assert.equal(sample.payments.some(row => row.orderNo === 'WINTESTNAME'), false);
    assert.equal(sample.kpis.freeOnline >= 4, true);
    assert.equal(sample.kpis.inpersonPaid, 2);
  });


  await test('overview and csv hide or export test names only when logged in', async () => {
    const created = new Date().toISOString();
    sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('app-elsa', 'elsa測試', 'elsa@example.test', '+886900000091', 'QA', 'QA', 'QA', ONLINE, '', created);
    sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('app-liao', ' 廖子淇 ', 'liao@example.test', '+886900000092', 'QA', 'QA', 'QA', DAY16, '', created);
    sqlite.prepare('INSERT INTO payment_orders (id,application_id,order_no,merchant,amount,token,request_id,status,created_at,consent_at,source,paid_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run('order-liao', 'app-liao', 'WINLIAO', 'M', 399, 'token-liao', 'request-liao', 'paid', created, created, 'https://2027course.win-lin.com/#apply', created);
    sqlite.prepare('INSERT INTO applications (id,name,email,phone,profession,stage,topic,session_code,line_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').run('app-friend', '廖子淇的朋友', 'friend@example.test', '+886900000093', 'QA', 'QA', 'QA', ONLINE, '', created);
    const csvRoute = load('app/api/admin/test-registrations/route.ts');
    assert.equal((await csvRoute.GET(new Request('https://2027course.win-lin.com/api/admin/test-registrations'))).status, 401);
    const token = auth.createAdminSessionToken();
    const allowed = await overview.GET(new Request('https://2027course.win-lin.com/api/admin/overview', { headers: { cookie: `win_admin_session=${token}` } }));
    assert.equal(allowed.status, 200);
    const body = await allowed.json();
    assert.equal(body.registrations.some(row => row.email === 'elsa@example.test' || row.email === 'liao@example.test'), false);
    assert.equal(body.registrations.some(row => row.email === 'friend@example.test' && row.result === '免費登記'), true);
    assert.equal(body.kpis.excludedTestNames >= 2, true);
    const csvResponse = await csvRoute.GET(new Request('https://2027course.win-lin.com/api/admin/test-registrations', { headers: { cookie: `win_admin_session=${token}` } }));
    assert.equal(csvResponse.status, 200);
    const csv = await csvResponse.text();
    assert.match(csv, /elsa測試/);
    assert.match(csv, /廖子淇/);
    assert.equal(csv.includes('friend@example.test'), false);
    assert.equal(csv.includes('unit-test-admin-password'), false);
  });

  await test('dev fixture is ignored in production', async () => {
    process.env.ADMIN_DASHBOARD_FIXTURE = '1';
    process.env.NODE_ENV = 'production';
    const live = await report.loadReport(7);
    assert.equal(live.fixture, false);
    process.env.NODE_ENV = 'development';
    const sample = await report.loadReport(7);
    assert.equal(sample.fixture, true);
    assert.equal(sample.kpis.freeOnline >= 1, true);
    assert.equal(sample.kpis.inpersonPaid >= 1, true);
    delete process.env.ADMIN_DASHBOARD_FIXTURE;
    process.env.NODE_ENV = 'test';
  });

  console.log(`${passes} admin checks passed`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
