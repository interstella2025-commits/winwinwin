export const ANALYTICS_OPT_OUT_KEY = 'win_analytics_opt_out';
export const ANALYTICS_FLUSH_EVENT = 'win-analytics-flush';

/** Flush queued first-party events with sendBeacon before a full-page navigation. */
export function flushWinAnalytics() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(ANALYTICS_FLUSH_EVENT));
}
