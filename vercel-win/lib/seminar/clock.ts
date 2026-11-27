import type { Phase, SeminarConfig, SeminarState } from './types';

export const PHASES: Phase[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];
export const PHASE_LABEL: Record<Phase, string> = {
  S0: '開放預約', S1: '即將開始', S2: '說明會進行中', S3: '進行中・方案開放', S4: '已結束・方案開放中', S5: '方案已截止',
};

type Times = { start: number; soon: number; offer: number; end: number; deadline: number; duration: number; scale: number };

export function realTimes(cfg: SeminarConfig): Times {
  const s = cfg.schedule;
  const start = Date.parse(s.startAt);
  if (!Number.isFinite(start)) throw new Error('Invalid startAt');
  const duration = Math.max(60, Math.floor(s.durationSeconds));
  const end = start + duration * 1000;
  const offer = start + Math.min(Math.max(0, s.offerAtSeconds), duration) * 1000;
  const dl = s.offerDeadline ? Date.parse(s.offerDeadline) : NaN;
  const deadline = Number.isFinite(dl) && dl > end ? dl : end;
  return { start, soon: start - Math.max(0, s.soonMinutes) * 60000, offer, end, deadline, duration, scale: 1 };
}

/** 示範時間軸：120 秒跑完六種狀態，然後重來。 */
export const DEMO_LOOP = 120_000;
const DEMO = { soon: 12_000, start: 24_000, video: 66, deadlineAfter: 15_000 };
/** 每個狀態在示範時間軸上的中間點（毫秒），給 ?at=S3 這種固定畫面用。 */
const DEMO_PIN: Record<Phase, number> = { S0: 4_000, S1: 16_000, S2: 34_000, S3: 70_000, S4: 96_000, S5: 112_000 };

export function demoTimes(cfg: SeminarConfig, now: number, pin?: Phase | null): Times {
  const base = pin ? now - DEMO_PIN[pin] : Math.floor(now / DEMO_LOOP) * DEMO_LOOP;
  const real = Math.max(60, cfg.schedule.durationSeconds);
  const scale = DEMO.video / real;
  const start = base + DEMO.start;
  const end = start + DEMO.video * 1000;
  const offerAt = Math.min(Math.max(0, cfg.schedule.offerAtSeconds), real) * scale;
  // 方案至少要在示範裡出現 20 秒，避免看不到 S3。
  const offer = Math.min(start + offerAt * 1000, end - 20_000);
  return { start, soon: base + DEMO.soon, offer, end, deadline: end + DEMO.deadlineAfter, duration: DEMO.video, scale };
}

export function phaseAt(t: Times, now: number): Phase {
  if (now < t.soon) return 'S0';
  if (now < t.start) return 'S1';
  if (now < t.offer) return 'S2';
  if (now < t.end) return 'S3';
  if (now < t.deadline) return 'S4';
  return 'S5';
}

export function buildState(cfg: SeminarConfig, now: Date, opts: { demo: boolean; pin?: Phase | null; checkoutLive: boolean }): SeminarState {
  const t = opts.demo ? demoTimes(cfg, now.getTime(), opts.pin) : realTimes(cfg);
  const n = now.getTime();
  const phase = phaseAt(t, n);
  const position = phase === 'S2' || phase === 'S3' ? (n - t.start) / 1000 : phase === 'S0' || phase === 'S1' ? 0 : t.duration;
  return {
    slug: cfg.slug,
    serverNow: now.toISOString(),
    startAt: new Date(t.start).toISOString(),
    endsAt: new Date(t.end).toISOString(),
    offerAt: new Date(t.offer).toISOString(),
    offerDeadline: new Date(t.deadline).toISOString(),
    soonAt: new Date(t.soon).toISOString(),
    durationSeconds: t.duration,
    phase,
    positionSeconds: position,
    demo: opts.demo,
    timeScale: t.scale,
    checkoutLive: opts.checkoutLive,
  };
}

/** 依目前時間在瀏覽器端重算狀態（伺服器時間差已校正）。 */
export function clientPhase(s: SeminarState, now: number): Phase {
  return phaseAt({ start: Date.parse(s.startAt), soon: Date.parse(s.soonAt), offer: Date.parse(s.offerAt), end: Date.parse(s.endsAt), deadline: Date.parse(s.offerDeadline), duration: s.durationSeconds, scale: s.timeScale }, now);
}

export function shouldResync(current: number, target: number, tolerance = 1.5) {
  return Number.isFinite(current) && Number.isFinite(target) && Math.abs(current - target) > tolerance;
}

export function countdownParts(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return {
    d: Math.floor(total / 86400),
    h: Math.floor((total % 86400) / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

export function formatTaipei(iso: string) {
  const parts = new Intl.DateTimeFormat('zh-Hant-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const get = (k: string) => parts.find(p => p.type === k)?.value || '';
  return `${get('month')}/${get('day')}（${get('weekday').replace('週', '')}）${get('hour')}:${get('minute')}`;
}

export function formatTimestamp(seconds: number) {
  const t = Math.max(0, Math.floor(seconds));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map(v => String(v).padStart(2, '0')).join(':');
}

export function parseTimestamp(v: string) {
  const m = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(v.trim());
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export function formatTwd(n: number) {
  return `NT$${new Intl.NumberFormat('zh-Hant-TW').format(n)}`;
}
