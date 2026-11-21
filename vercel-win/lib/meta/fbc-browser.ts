'use client';

import { fbcFromFbclid, isMetaFbc } from './fbc';

const STORAGE_KEY = 'win_meta_fbc';

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try { return decodeURIComponent(part.slice(eq + 1).trim()); } catch { return; }
  }
}

function storedFbc(): string | undefined {
  try {
    const value = sessionStorage.getItem(STORAGE_KEY);
    return isMetaFbc(value) ? value : undefined;
  } catch {
    return;
  }
}

function persist(value: string) {
  try { sessionStorage.setItem(STORAGE_KEY, value); } catch { /* private mode */ }
}

/** Prefer _fbc, otherwise keep or build fb.1.{ts}.{fbclid} from the landing URL. */
export function rememberMetaFbc(): string | undefined {
  if (typeof window === 'undefined') return;
  const cookie = readCookie('_fbc');
  if (isMetaFbc(cookie)) {
    persist(cookie);
    return cookie;
  }
  const existing = storedFbc();
  if (existing) return existing;
  const fbclid = new URLSearchParams(window.location.search).get('fbclid') || '';
  const built = fbcFromFbclid(fbclid);
  if (!built) return;
  persist(built);
  return built;
}

/** Value to send with signup requests so CAPI can set fbc when the cookie is absent. */
export function metaFbcForRequest(): string | undefined {
  if (typeof window === 'undefined') return;
  const cookie = readCookie('_fbc');
  if (isMetaFbc(cookie)) return cookie;
  return storedFbc() || rememberMetaFbc();
}
