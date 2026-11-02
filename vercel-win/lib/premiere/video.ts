function read(env: Record<string, string | undefined>, name: string) {
  return (env[name] || '').trim();
}

function bunnyUrl(env: Record<string, string | undefined>) {
  const videoId = read(env, 'BUNNY_STREAM_VIDEO_ID');
  const host = read(env, 'BUNNY_STREAM_CDN_HOSTNAME').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.$/, '');
  if (!videoId || !host) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId)) return null;
  if (!/^[a-z0-9.-]+$/i.test(host)) return null;
  if (!host.endsWith('.b-cdn.net') && !host.endsWith('.bunnycdn.com')) return null;
  return `https://${host}/${videoId}/playlist.m3u8`;
}

/** Public Cloudflare Stream HLS. No signing secret. The customer host is not a secret. */
export function cloudflareStreamUrl(env: Record<string, string | undefined>) {
  const videoId = read(env, 'CLOUDFLARE_STREAM_VIDEO_ID');
  let host = read(env, 'CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.$/, '').toLowerCase();
  if (!videoId || !host) return null;
  if (!/^[0-9a-f]{32}$/i.test(videoId)) return null;
  if (!host.includes('.')) host = `${host}.cloudflarestream.com`;
  if (!/^customer-[a-z0-9]+\.cloudflarestream\.com$/.test(host)) return null;
  return `https://${host}/${videoId}/manifest/video.m3u8`;
}

/** 11-character YouTube id. Empty unless PREMIERE_VIDEO_PROVIDER is youtube, or nothing else is configured. */
export function youtubeVideoId(env: Record<string, string | undefined>) {
  const videoId = read(env, 'PREMIERE_YOUTUBE_VIDEO_ID');
  return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
}

export function premiereLineUrl(env: Record<string, string | undefined>) {
  const raw = read(env, 'PREMIERE_LINE_URL');
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export type PremiereSource = { hlsUrl: string | null; youtubeId: string | null };

/**
 * Public playback. Bunny stays the default when several are set.
 * PREMIERE_VIDEO_PROVIDER: bunny, cloudflare, or youtube.
 * Never reads a signing secret. YouTube is for preview; the watch page on youtube.com cannot be locked.
 */
export function premiereSource(env: Record<string, string | undefined>): PremiereSource {
  const bunny = bunnyUrl(env);
  const cloudflare = cloudflareStreamUrl(env);
  const youtube = youtubeVideoId(env);
  const provider = read(env, 'PREMIERE_VIDEO_PROVIDER').toLowerCase();
  if (provider === 'youtube') return { hlsUrl: null, youtubeId: youtube };
  if (provider === 'cloudflare') return { hlsUrl: cloudflare, youtubeId: null };
  if (provider === 'bunny') return { hlsUrl: bunny, youtubeId: null };
  if (bunny) return { hlsUrl: bunny, youtubeId: null };
  if (cloudflare) return { hlsUrl: cloudflare, youtubeId: null };
  return { hlsUrl: null, youtubeId: youtube };
}

export function premiereHlsUrl(env: Record<string, string | undefined>) {
  return premiereSource(env).hlsUrl;
}
