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
};

function enabled(env: Record<string, string | undefined>, name: string) {
  return env[name] === '1';
}

export function getPremiereState(now: Date, env: Record<string, string | undefined> = process.env): PremiereState {
  const clock = premiereClock(now, PREMIERE);
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
    checkoutEnabled: enabled(env, 'PREMIERE_CHECKOUT_ENABLED'),
    hlsUrl: premiereHlsUrl(env),
  };
}
