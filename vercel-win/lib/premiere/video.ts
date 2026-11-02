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

/**
 * Public playback URL. Bunny stays the default when both are set.
 * Set PREMIERE_VIDEO_PROVIDER to bunny or cloudflare to choose.
 * Never reads a signing secret.
 */
export function premiereHlsUrl(env: Record<string, string | undefined>) {
  const bunny = bunnyUrl(env);
  const cloudflare = cloudflareStreamUrl(env);
  const provider = read(env, 'PREMIERE_VIDEO_PROVIDER').toLowerCase();
  if (provider === 'cloudflare') return cloudflare;
  if (provider === 'bunny') return bunny;
  return bunny || cloudflare;
}
