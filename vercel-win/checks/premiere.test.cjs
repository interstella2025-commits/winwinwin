const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const dirname = path.dirname(file);
  new Function('require', 'module', 'exports', code)(
    name => load(path.resolve(dirname, name.endsWith('.ts') ? name : name + '.ts')),
    module,
    module.exports,
  );
  return module.exports;
}

const schedule = load('lib/premiere/schedule.ts');
const video = load('lib/premiere/video.ts');
const state = load('lib/premiere/state.ts');
const config = load('lib/premiere/config.ts');
const copy = load('lib/premiere/payment-copy.ts');

const start = Date.parse('2026-11-03T19:30:00+08:00');
const session = { startAt: '2026-11-03T19:30:00+08:00', durationSeconds: 90 * 60, offerAt: '2026-11-03T20:30:00+08:00' };

assert.equal(config.PREMIERE.priceTwd, 39800);
assert.equal(config.PREMIERE.productCode, 'fullcourse');
assert.equal(config.PREMIERE.startAt, '2026-11-03T19:30:00+08:00');

const before = schedule.premiereClock(new Date(start - 1000), session);
assert.equal(before.phase, 'countdown');
assert.equal(before.positionSeconds, 0);
assert.equal(before.offerOpen, false);

const late = schedule.premiereClock(new Date(start + 125000), session);
assert.equal(late.phase, 'playing');
assert.equal(late.positionSeconds, 125);
assert.equal(late.offerOpen, false);

const offer = schedule.premiereClock(new Date(start + 60 * 60 * 1000), session);
assert.equal(offer.phase, 'playing');
assert.equal(offer.offerOpen, true);
assert.equal(schedule.premiereClock(new Date(start + 60 * 60 * 1000 - 1), session).offerOpen, false);

const ended = schedule.premiereClock(new Date(start + 90 * 60 * 1000 + 5000), session);
assert.equal(ended.phase, 'ended');
assert.equal(ended.positionSeconds, 90 * 60);
assert.equal(ended.offerOpen, true);

assert.equal(schedule.playbackTarget(-4, 100), 0);
assert.equal(schedule.playbackTarget(140, 100), 100);
assert.equal(schedule.shouldResync(10, 12), true);
assert.equal(schedule.shouldResync(10, 10.5), false);
assert.equal(schedule.formatCountdown(90 * 1000), '0 小時 01 分 30 秒');
assert.match(schedule.formatCountdown(2 * 86400 * 1000), /^2 天 /);

assert.equal(video.premiereHlsUrl({}), null);
assert.equal(video.premiereHlsUrl({ BUNNY_STREAM_VIDEO_ID: 'not-a-uuid', BUNNY_STREAM_CDN_HOSTNAME: 'vz-1.b-cdn.net' }), null);
assert.equal(video.premiereHlsUrl({ BUNNY_STREAM_VIDEO_ID: '11111111-1111-1111-1111-111111111111', BUNNY_STREAM_CDN_HOSTNAME: 'https://evil.example/path' }), null);
assert.equal(
  video.premiereHlsUrl({ BUNNY_STREAM_VIDEO_ID: '11111111-1111-1111-1111-111111111111', BUNNY_STREAM_CDN_HOSTNAME: 'https://vz-demo.b-cdn.net/extra' }),
  'https://vz-demo.b-cdn.net/11111111-1111-1111-1111-111111111111/playlist.m3u8',
);

const hidden = state.getPremiereState(new Date(start - 1000), {});
assert.equal(hidden.phase, 'countdown');
assert.equal(hidden.checkoutEnabled, false);
assert.equal(hidden.hlsUrl, null);
assert.equal(hidden.priceTwd, 39800);
const armed = state.getPremiereState(new Date(start), { PREMIERE_CHECKOUT_ENABLED: '1', BUNNY_STREAM_VIDEO_ID: '11111111-1111-1111-1111-111111111111', BUNNY_STREAM_CDN_HOSTNAME: 'vz-demo.b-cdn.net' });
assert.equal(armed.phase, 'playing');
assert.equal(armed.positionSeconds, 0);
assert.equal(armed.checkoutEnabled, true);
assert.match(armed.hlsUrl, /playlist\.m3u8$/);

assert.equal(copy.PRECOURSE_PAID_BODY, '已收到你的 NT$399 前導課款項。線上課程的實際安排與上課連結將另行通知。');
assert.equal(copy.PRECOURSE_PRODUCT, 'WIN 講師班｜90分鐘線上前導課');
assert.equal(copy.isFullCourse({ amount: 399 }), false);
assert.equal(copy.isFullCourse({ amount: 39800 }), true);
assert.equal(copy.isFullCourse({ amount: 39800, isTest: true }), false);
assert.equal(copy.paymentPaidBody({ amount: 399, isTest: false }), copy.PRECOURSE_PAID_BODY);
assert.equal(copy.paymentProductLine({ amount: 39800 }), config.PREMIERE.payment.productLine);
assert.doesNotMatch(copy.paymentPaidBody({ amount: 39800 }), /NT\$399/);

const roots = ['app/premiere', 'lib/premiere', 'app/api/premiere'];
const banned = ['直播', '人正在看', '剛剛購買'];
for (const root of roots) {
  for (const file of fs.readdirSync(root, { recursive: true })) {
    const full = path.join(root, file.toString());
    if (!fs.statSync(full).isFile()) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const word of banned) assert.equal(text.includes(word), false, `${full} contains ${word}`);
  }
}
const player = fs.readFileSync('app/premiere/player.tsx', 'utf8');
assert.equal(player.includes('amount:'), false);
assert.match(player, /product: state\.productCode/);
assert.match(player, /premiere\/register/);

console.log('PASS premiere clock, late join, offer gate, ended state, Bunny URL, 399 copy lock');
