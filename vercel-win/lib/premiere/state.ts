import { PREMIERE } from './config';
import { premiereClock } from './schedule';
import { premiereHlsUrl } from './video';

export type PremiereState = {
  serverNow: string;
  startAt: string;
  endsAt: string;
  offerAt: string;
  durationSeconds: number;
  phase: 'countdown' | 'playing' | 'ended';
  positionSeconds: number;
  offerOpen: boolean;
  priceTwd: number;
  productCode: typeof PREMIERE.productCode;
  checkoutEnabled: boolean;
  hlsUrl: string | null;
  /** Preview-only compressed schedule. Always false on production. */
  demo: boolean;
};

function enabled(env: Record<string, string | undefined>, name: string) {
  return env[name] === '1';
}

export function premierePageEnabled(env: Record<string, string | undefined> = process.env) {
  return enabled(env, 'PREMIERE_PAGE_ENABLED');
}

/** Compressed preview schedule. Production (VERCEL_ENV=production) never qualifies. */
export function premiereDemoAllowed(env: Record<string, string | undefined> = process.env) {
  return env.VERCEL_ENV !== 'production';
}

export function premiereDemoRequested(flag: string | null | undefined, env: Record<string, string | undefined> = process.env) {
  return flag === '1' && premiereDemoAllowed(env);
}

/** Same two-minute loop for every poll, so the preview does not slide forward. */
export function demoSchedule(now: Date): { startAt: string; offerAt: string; durationSeconds: number } {
  const bucket = Math.floor(now.getTime() / 120_000) * 120_000;
  const start = bucket + 15_000;
  return {
    startAt: new Date(start).toISOString(),
    offerAt: new Date(start + 25_000).toISOString(),
    durationSeconds: 70,
  };
}

/** Checkout stays off while public copy or the gateway name is still a placeholder. */
export function premiereCheckoutEnabled(env: Record<string, string | undefined>, copyText = JSON.stringify(PREMIERE), productText = PREMIERE.gatewayName) {
  if (!enabled(env, 'PREMIERE_CHECKOUT_ENABLED')) return false;
  if (copyText.includes('待 Elsa 確認') || productText.includes('待 Elsa 確認')) return false;
  return true;
}

export function getPremiereState(now: Date, env: Record<string, string | undefined> = process.env, options: { demo?: boolean } = {}): PremiereState {
  const demo = options.demo === true && premiereDemoAllowed(env);
  const schedule = demo ? demoSchedule(now) : PREMIERE;
  const clock = premiereClock(now, schedule);
  return {
    serverNow: now.toISOString(),
    startAt: new Date(clock.start).toISOString(),
    endsAt: new Date(clock.end).toISOString(),
    offerAt: new Date(clock.offer).toISOString(),
    durationSeconds: clock.durationSeconds,
    phase: clock.phase,
    positionSeconds: clock.positionSeconds,
    offerOpen: clock.offerOpen,
    priceTwd: PREMIERE.priceTwd,
    productCode: PREMIERE.productCode,
    checkoutEnabled: demo ? true : premiereCheckoutEnabled(env),
    hlsUrl: premiereHlsUrl(env),
    demo,
  };
}
