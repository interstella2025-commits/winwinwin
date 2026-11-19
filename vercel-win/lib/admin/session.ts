import { cookies } from 'next/headers';
import { ADMIN_COOKIE, verifyAdminSessionToken } from './auth';

export async function isAdminAuthenticated() {
  try {
    const store = await cookies();
    return verifyAdminSessionToken(store.get(ADMIN_COOKIE)?.value);
  } catch {
    return false;
  }
}
