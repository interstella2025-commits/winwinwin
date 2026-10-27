function read(env: Record<string, string | undefined>, name: string) {
  return (env[name] || '').trim();
}

/** Public Bunny Stream HLS address. Returns null until both env values are valid. Never reads a signing secret. */
export function premiereHlsUrl(env: Record<string, string | undefined>) {
  const videoId = read(env, 'BUNNY_STREAM_VIDEO_ID');
  const host = read(env, 'BUNNY_STREAM_CDN_HOSTNAME').replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\.$/, '');
  if (!videoId || !host) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId)) return null;
  if (!/^[a-z0-9.-]+$/i.test(host)) return null;
  if (!host.endsWith('.b-cdn.net') && !host.endsWith('.bunnycdn.com')) return null;
  return `https://${host}/${videoId}/playlist.m3u8`;
}
