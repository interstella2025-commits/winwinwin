/** Shared Meta fbc / fbclid checks. Safe to import from client and server. */

export const META_FBC = /^fb\.1\.\d{10,13}\.[A-Za-z0-9_-]{1,128}$/;
export const META_FBCLID = /^[A-Za-z0-9_-]{1,128}$/;

export function isMetaFbc(value: unknown): value is string {
  return typeof value === 'string' && META_FBC.test(value);
}

/** Build fbc when the Pixel cookie is missing but the landing URL has fbclid. */
export function fbcFromFbclid(fbclid: string, timestamp = Date.now()): string | undefined {
  if (!META_FBCLID.test(fbclid)) return;
  return `fb.1.${timestamp}.${fbclid}`;
}
