export type PremierePhase = 'countdown' | 'playing' | 'ended';

export type PremiereSchedule = {
  startAt: string;
  durationSeconds: number;
  offerAt: string;
};

export type PremiereClock = {
  phase: PremierePhase;
  positionSeconds: number;
  offerOpen: boolean;
  start: number;
  end: number;
  offer: number;
  durationSeconds: number;
};

export function premiereClock(now: Date, schedule: PremiereSchedule): PremiereClock {
  const start = Date.parse(schedule.startAt);
  const offer = Date.parse(schedule.offerAt);
  if (!Number.isFinite(start) || !Number.isFinite(offer)) throw new Error('Invalid premiere schedule');
  const durationSeconds = Math.max(0, schedule.durationSeconds);
  const end = start + durationSeconds * 1000;
  const time = now.getTime();
  const phase: PremierePhase = time >= end ? 'ended' : time >= start ? 'playing' : 'countdown';
  const positionSeconds = phase === 'countdown' ? 0 : phase === 'ended' ? durationSeconds : (time - start) / 1000;
  return { phase, positionSeconds, offerOpen: time >= offer, start, end, offer, durationSeconds };
}

export function playbackTarget(positionSeconds: number, durationSeconds: number) {
  if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds)) return 0;
  return Math.min(Math.max(0, durationSeconds), Math.max(0, positionSeconds));
}

/** True when the viewer has moved away from the server-derived position. */
export function shouldResync(currentTime: number, target: number, tolerance = 1.2) {
  if (!Number.isFinite(currentTime) || !Number.isFinite(target)) return false;
  return Math.abs(currentTime - target) > tolerance;
}

export function formatCountdown(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const clock = `${hours} 小時 ${String(minutes).padStart(2, '0')} 分 ${String(seconds).padStart(2, '0')} 秒`;
  return days > 0 ? `${days} 天 ${clock}` : clock;
}

export function formatDuration(seconds: number) {
  if (seconds % 60 === 0) return `${seconds / 60} 分鐘`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes} 分 ${rest} 秒`;
}

export function formatTaipei(iso: string) {
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

export function formatTwd(amount: number) {
  return `NT$${new Intl.NumberFormat('zh-Hant-TW').format(amount)}`;
}
