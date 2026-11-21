const UTM_SOURCE_LABELS: Record<string, string> = {
  fb: 'Facebook',
  facebook: 'Facebook',
  ig: 'Instagram',
  instagram: 'Instagram',
  th: 'Threads',
  threads: 'Threads',
};

function referrerHost(referrer: string | null) {
  if (!referrer) return '';
  try {
    return new URL(referrer).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function isOwnHost(host: string) {
  if (!host) return false;
  if (host === '2027course.win-lin.com' || host === 'localhost') return true;
  if (host.endsWith('.win-lin.com')) return true;
  if (host.startsWith('win-lecturer-20261018') && host.endsWith('.vercel.app')) return true;
  return false;
}

function isFacebookHost(host: string) {
  return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.com' || host.endsWith('.fb.com') || host === 'fb.me';
}

export function sourceLabel(session: { utm_source: string | null; utm_medium: string | null; referrer: string | null }) {
  if (session.utm_source) {
    const key = session.utm_source.trim().toLowerCase();
    const mapped = UTM_SOURCE_LABELS[key] || session.utm_source;
    return [mapped, session.utm_medium].filter(Boolean).join(' / ');
  }
  if (!session.referrer) return '直接進站';
  const host = referrerHost(session.referrer);
  if (!host) return '其他來源';
  if (isOwnHost(host)) return '直接進站';
  if (isFacebookHost(host)) return 'Facebook（自然）';
  return host;
}
