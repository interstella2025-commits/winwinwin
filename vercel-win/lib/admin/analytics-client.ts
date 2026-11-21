export const ANALYTICS_OPT_OUT_KEY = 'win_analytics_opt_out';
export const ANALYTICS_FLUSH_EVENT = 'win-analytics-flush';

/** Flush queued first-party events with sendBeacon before a full-page navigation. */
export function flushWinAnalytics() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ANALYTICS_FLUSH_EVENT));
}

export const ANALYTICS_VISITOR_KEY = 'win_analytics_visitor_id';
export const ANALYTICS_SESSION_KEY = 'win_analytics_session_id';
export const ANALYTICS_STARTED_KEY = 'win_analytics_started_at';
export const ANALYTICS_LAST_ACTIVE_KEY = 'win_analytics_last_active_at';
/** A visit ends after 30 minutes without interaction; the next interaction starts a new visit. */
export const SESSION_IDLE_MS = 30 * 60 * 1000;

export function isSessionExpired(lastActiveMs: number, nowMs: number) {
  return Number.isFinite(lastActiveMs) && lastActiveMs > 0 && nowMs - lastActiveMs > SESSION_IDLE_MS;
}

/** Analytics ids sent with a registration so the server can attach first-touch source data. */
export function analyticsIdsForRequest(): { analyticsVisitorId?: string; analyticsSessionId?: string } {
  if (typeof window === 'undefined') return {};
  const ids: { analyticsVisitorId?: string; analyticsSessionId?: string } = {};
  try {
    const visitor = window.localStorage.getItem(ANALYTICS_VISITOR_KEY);
    if (visitor) ids.analyticsVisitorId = visitor;
  } catch { /* storage unavailable */ }
  try {
    const session = window.sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (session) ids.analyticsSessionId = session;
  } catch { /* storage unavailable */ }
  return ids;
}
