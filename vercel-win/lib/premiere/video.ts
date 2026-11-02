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

export type VimeoEmbed = { id: string; hash: string };

const VIMEO_PARAMS = {
  controls: '0',
  title: '0',
  byline: '0',
  portrait: '0',
  muted: '1',
  autoplay: '1',
  playsinline: '1',
  dnt: '1',
  keyboard: '0',
  pip: '0',
} as const;

/** Unlisted Vimeo clip. The hash is the public `h` parameter, not a signing secret. */
export function vimeoEmbed(env: Record<string, string | undefined>): VimeoEmbed | null {
  const id = read(env, 'PREMIERE_VIMEO_VIDEO_ID');
  const hash = read(env, 'PREMIERE_VIMEO_HASH');
  if (!/^\d{6,12}$/.test(id) || !/^[a-f0-9]{8,64}$/i.test(hash)) return null;
  return { id, hash };
}

export function vimeoPlayerUrl(id: string, hash: string) {
  const url = new URL(`https://player.vimeo.com/video/${id}`);
  url.searchParams.set('h', hash);
  for (const [key, value] of Object.entries(VIMEO_PARAMS)) url.searchParams.set(key, value);
  return url.toString();
}

export type PremiereSource = { hlsUrl: string | null; youtubeId: string | null; vimeoId: string | null; vimeoHash: string | null };

const emptySource: PremiereSource = { hlsUrl: null, youtubeId: null, vimeoId: null, vimeoHash: null };

/**
 * Public playback. Bunny stays the default when several are set.
 * PREMIERE_VIDEO_PROVIDER: bunny, cloudflare, youtube, or vimeo.
 * Never reads a signing secret. YouTube can still be opened on youtube.com.
 * Vimeo `controls=0` can be ignored by some account plans; playback sync still runs.
 */
export function premiereSource(env: Record<string, string | undefined>): PremiereSource {
  const bunny = bunnyUrl(env);
  const cloudflare = cloudflareStreamUrl(env);
  const youtube = youtubeVideoId(env);
  const vimeo = vimeoEmbed(env);
  const provider = read(env, 'PREMIERE_VIDEO_PROVIDER').toLowerCase();
  if (provider === 'youtube') return { ...emptySource, youtubeId: youtube };
  if (provider === 'vimeo') return { ...emptySource, vimeoId: vimeo?.id || null, vimeoHash: vimeo?.hash || null };
  if (provider === 'cloudflare') return { ...emptySource, hlsUrl: cloudflare };
  if (provider === 'bunny') return { ...emptySource, hlsUrl: bunny };
  if (bunny) return { ...emptySource, hlsUrl: bunny };
  if (cloudflare) return { ...emptySource, hlsUrl: cloudflare };
  if (youtube) return { ...emptySource, youtubeId: youtube };
  return { ...emptySource, vimeoId: vimeo?.id || null, vimeoHash: vimeo?.hash || null };
}

export function premiereHlsUrl(env: Record<string, string | undefined>) {
  return premiereSource(env).hlsUrl;
}
