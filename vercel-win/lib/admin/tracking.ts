export const OUTCOME_PATHS = [
  '/api/payuni/create',
  '/api/apply',
  '/api/notify-signup',
  '/api/online-signup',
  '/api/enroll',
  '/api/register',
  '/api/signup',
  '/api/free-signup',
];

export type TrackOffer = 'online' | 'inperson' | 'notify' | 'unknown';

export function offerFromForm(format: string, sessionCode: string): TrackOffer {
  if (sessionCode === 'notify') return 'notify';
  if (sessionCode.startsWith('實體')) return 'inperson';
  if (sessionCode.startsWith('線上')) return 'online';
  if (format === 'online' || format === 'inperson') return format;
  return 'unknown';
}

export function outcomeKind(pathname: string, body: { ok?: boolean; checkoutUrl?: string } | null) {
  const matched = OUTCOME_PATHS.some(item => pathname === item || pathname.endsWith(item));
  if (!matched || !body) return null;
  if (typeof body.checkoutUrl === 'string' && body.checkoutUrl.length > 0) return 'payment_start' as const;
  if (body.ok === true) return 'registered' as const;
  return null;
}
