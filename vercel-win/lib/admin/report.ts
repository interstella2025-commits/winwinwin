import { db } from '../payuni/db';
import { classifyApplication, displaySession, isDecember16, isDecember23, isPaid399, isTestOrder, type OrderFact } from './offers';
import { fixtureReport } from './fixture';
import { ensureAnalyticsTables } from './schema';
import { isExcludedTestName, type ExcludedTestRow } from './test-registrations';
import { loadAttributionSources } from './attribution';

export type SessionRow = {
  id: string;
  visitor_id: string;
  started_at: string;
  last_seen_at: string;
  referrer: string | null;
  device_type: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  max_scroll_depth: number | string | null;
  last_stage: string | null;
};

export type EventRow = {
  session_id: string;
  event_name: string;
  offer: string | null;
  event_data: unknown;
  occurred_at: string;
};

export type JoinRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  session_code: string | null;
  created_at: string;
  order_id: string | null;
  order_no: string | null;
  amount: number | string | null;
  status: string | null;
  source: string | null;
  paid_at: string | null;
  order_created_at: string | null;
};

export type GroupedApplication = {
  id: string;
  name: string;
  email: string;
  phone: string;
  sessionCode: string | null;
  createdAt: string;
  orders: OrderFact[];
  attribution?: { source: string | null; campaign: string | null; lastSource: string | null } | null;
};

export type EmailStatusRow = {
  application_id: string;
  kind: 'online' | 'order';
  email_status: string;
  email_lease: number | string | null;
};

export type FunnelStep = {
  label: string;
  count: number;
  basis: 'sessions' | 'records';
  detail?: string;
};

export type DashboardReport = {
  days: number;
  since: string;
  fixture: boolean;
  analyticsUnavailable: boolean;
  registrationsUnavailable: boolean;
  trackingStartedAt: string | null;
  sessionsCapped: boolean;
  eventsCapped: boolean;
  registrationsTotal: number;
  paymentsTotal: number;
  kpis: {
    sessions: number;
    visitors: number;
    averageDwellSeconds: number;
    medianDwellSeconds: number;
    averageScroll: number;
    freeOnline: number;
    onlineAbandoned: number;
    onlinePaid: number;
    onlinePaidAmount: number;
    inpersonPaid: number;
    inpersonPaidAmount: number;
    inpersonPaid1216: number;
    inpersonPaid1223: number;
    inpersonStarted: number;
    notify: number;
    notifyRecords: number;
    emailFailed: number;
    emailPending: number;
    excludedTestOrders: number;
    excludedTestNames: number;
  };
  devices: { key: string; label: string; count: number }[];
  dwellBuckets: { label: string; count: number }[];
  sources: {
    label: string;
    campaign: string | null;
    sessions: number;
    averageDwellSeconds: number;
    cta: number;
    formStart: number;
    submit: number;
    paymentStart: number;
  }[];
  funnels: { online: FunnelStep[]; inperson: FunnelStep[] };
  registrations: { createdAt: string; name: string; email: string; phone: string; session: string; result: string; source: string | null }[];
  registrationSources: { label: string; count: number }[];
  payments: { at: string; orderNo: string; amount: number; status: string; session: string; name: string }[];
  periodCaption: string;
  trend: { label: string; visits: number; formStarts: number; completions: number }[];
  scrollBuckets: { label: string; count: number }[];
  eventCounts: { key: string; label: string; count: number }[];
  offerPerformance: { key: string; name: string; starts: number; submits: number; completions: number }[];
  excludedTests: ExcludedTestRow[];
};

const DEVICE_LABELS: Record<string, string> = { mobile: '手機', tablet: '平板', desktop: '桌機', unknown: '未知' };

const DAY_MS = 24 * 60 * 60 * 1000;
const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

/** Start of a Taipei calendar-day window: today 00:00 (台北) minus days-1 days. Taipei has no DST. */
export function windowStart(days: number, now = Date.now()) {
  const todayStart = Math.floor((now + TAIPEI_OFFSET_MS) / DAY_MS) * DAY_MS - TAIPEI_OFFSET_MS;
  return new Date(todayStart - (Math.max(1, days) - 1) * DAY_MS).toISOString();
}

export function rangeLabel(days: number) {
  return days === 1 ? '今天（台北 00:00 起）' : `近 ${days} 天（台北日曆日，含今天）`;
}

export function rangeDays(value: string | undefined) {
  return value === '1' ? 1 : value === '30' ? 30 : 7;
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe} 秒`;
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return remaining ? `${minutes} 分 ${remaining} 秒` : `${minutes} 分`;
}

export function formatDurationCompact(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}秒`;
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return remaining ? `${minutes}分${remaining}秒` : `${minutes}分`;
}

export function formatTaipei(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export { sourceLabel } from './source-label';
import { sourceLabel } from './source-label';

/**
 * 'failed': the last attempt failed, or a send claim expired without finishing.
 * 'pending': not sent yet and no failure recorded. 'sent': delivered to Resend.
 */
export function emailState(row: { email_status: string; email_lease: number | string | null }, now = Date.now()) {
  if (row.email_status === 'sent') return 'sent' as const;
  if (row.email_status === 'failed') return 'failed' as const;
  if (row.email_status === 'sending' && Number(row.email_lease || 0) < now) return 'failed' as const;
  return 'pending' as const;
}

function readData(value: unknown) {
  if (value && typeof value === 'object') return value as Record<string, unknown>;
  if (typeof value !== 'string' || !value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function groupApplications(rows: JoinRow[]): GroupedApplication[] {
  const grouped = new Map<string, GroupedApplication>();
  for (const row of rows) {
    let application = grouped.get(row.id);
    if (!application) {
      application = { id: row.id, name: row.name, email: row.email, phone: row.phone, sessionCode: row.session_code, createdAt: row.created_at, orders: [] };
      grouped.set(row.id, application);
    }
    if (row.order_id && row.order_no && row.status && row.source) {
      application.orders.push({
        orderNo: row.order_no,
        amount: Number(row.amount || 0),
        status: row.status,
        source: row.source,
        paidAt: row.paid_at,
        createdAt: row.order_created_at || row.created_at,
      });
    }
  }
  return [...grouped.values()];
}

function dwellSeconds(session: SessionRow, events: EventRow[]) {
  const start = Date.parse(session.started_at);
  const end = Date.parse(session.last_seen_at);
  const span = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.round((end - start) / 1000)) : 0;
  const marked = events.reduce((max, event) => {
    if (event.session_id !== session.id || (event.event_name !== 'session_end' && event.event_name !== 'dwell_ping')) return max;
    const duration = Number(readData(event.event_data).durationSeconds || 0);
    return Number.isFinite(duration) ? Math.max(max, duration) : max;
  }, 0);
  return Math.max(span, marked);
}

function hasEvent(events: EventRow[], sessionId: string, name: string, offer?: string) {
  return events.some(event => event.session_id === sessionId && event.event_name === name && (!offer || event.offer === offer));
}

function countSessions(ids: string[], events: EventRow[], name: string, offer?: string) {
  return ids.filter(id => hasEvent(events, id, name, offer)).length;
}

const SUBMIT_EVENTS = new Set(['form_submit', 'form_submit_ok', 'payment_start', 'registered']);
const FORM_EVENTS = new Set(['form_start', 'form_submit', 'form_submit_ok', 'payment_start', 'registered']);

function sessionHasPathEvent(events: EventRow[], sessionId: string, names: Set<string>, offer: string) {
  return events.some(event => event.session_id === sessionId && names.has(event.event_name) && event.offer === offer);
}

/** Last non-unknown offer among a session's form events (start/submit/outcome). */
export function sessionResolvedOffer(events: EventRow[], sessionId: string) {
  const rows = events
    .filter(event => event.session_id === sessionId && FORM_EVENTS.has(event.event_name))
    .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at));
  let offer: string | undefined;
  for (const row of rows) {
    if (row.offer && row.offer !== 'unknown') offer = row.offer;
  }
  return offer;
}

/** Form start for a path: an event tagged with that offer, or a later path event after an untagged start. */
function sessionStartedForm(events: EventRow[], sessionId: string, offer: string) {
  const rows = events.filter(event => event.session_id === sessionId);
  if (rows.some(event => event.event_name === 'form_start' && event.offer === offer)) return true;
  if (sessionHasPathEvent(rows, sessionId, SUBMIT_EVENTS, offer)) return true;
  if (!rows.some(event => event.event_name === 'form_start')) return false;
  return sessionResolvedOffer(rows, sessionId) === offer;
}

function sessionSubmittedForm(events: EventRow[], sessionId: string, offer: string) {
  return sessionHasPathEvent(events, sessionId, SUBMIT_EVENTS, offer);
}

function countPathSessions(ids: string[], events: EventRow[], offer: string, kind: 'start' | 'submit') {
  const check = kind === 'start' ? sessionStartedForm : sessionSubmittedForm;
  return ids.filter(id => check(events, id, offer)).length;
}

function atLeast(value: number, floor: number) {
  return Math.max(value, floor);
}

function raiseToDownstream<T extends { count: number }>(steps: T[]): T[] {
  const counts = steps.map(step => step.count);
  for (let index = counts.length - 2; index >= 0; index -= 1) {
    counts[index] = Math.max(counts[index], counts[index + 1]);
  }
  return steps.map((step, index) => ({ ...step, count: counts[index] }));
}


function taipeiParts(iso: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

function bucketKey(iso: string, hourly: boolean) {
  const part = taipeiParts(iso);
  return hourly ? `${part.year}-${part.month}-${part.day}T${part.hour}` : `${part.year}-${part.month}-${part.day}`;
}

function bucketLabel(key: string, hourly: boolean) {
  if (hourly) return `${key.slice(11, 13)}:00`;
  return `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}`;
}

function enumerateBuckets(since: string, days: number, now = Date.now()) {
  const hourly = days === 1;
  const start = Date.parse(since);
  const step = hourly ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const keys: string[] = [];
  const seen = new Set<string>();
  for (let time = start; time <= now; time += step) {
    const key = bucketKey(new Date(time).toISOString(), hourly);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  const last = bucketKey(new Date(now).toISOString(), hourly);
  if (!seen.has(last)) keys.push(last);
  return keys;
}

export function formatTaipeiRange(since: string, now = Date.now()) {
  const format = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${format.format(new Date(since))} 至 ${format.format(new Date(now))}`;
}

function toExcludedRow(application: GroupedApplication, result: string): ExcludedTestRow {
  return {
    createdAt: application.createdAt,
    name: application.name,
    email: application.email,
    phone: application.phone,
    session: displaySession(application.sessionCode),
    result,
    orders: application.orders.map(order => ({
      orderNo: order.orderNo,
      amount: order.amount,
      status: order.status === 'paid' ? '已付款' : '未完成',
    })),
  };
}

export function buildReport(input: {
  days: number;
  since: string;
  sessions: SessionRow[];
  events: EventRow[];
  applications: GroupedApplication[];
  analyticsUnavailable: boolean;
  registrationsUnavailable: boolean;
  fixture: boolean;
  trackingStartedAt?: string | null;
  sessionsCapped?: boolean;
  eventsCapped?: boolean;
  emailStatuses?: EmailStatusRow[];
  now?: number;
}): DashboardReport {
  const sessions = input.sessions;
  const events = input.events;
  const dwells = sessions.map(session => dwellSeconds(session, events));
  const visibleApplications = input.applications.filter(application => !isExcludedTestName(application.name));
  const excludedApplications = input.applications.filter(application => isExcludedTestName(application.name));
  const classified = visibleApplications.map(application => ({ application, outcome: classifyApplication(application.sessionCode, application.orders) }));
  const excludedClassified = excludedApplications.map(application => ({ application, outcome: classifyApplication(application.sessionCode, application.orders) }));
  const sumPaid = (pick: (item: typeof classified[number]) => boolean, december16 = false) => classified.reduce((sum, item) => {
    if (!pick(item)) return sum;
    if (december16 && !isDecember16(item.application.sessionCode)) return sum;
    return sum + item.application.orders.filter(isPaid399).reduce((inner, order) => inner + order.amount, 0);
  }, 0);
  const countWhere = (pick: (item: typeof classified[number]) => boolean) => classified.filter(pick).length;
  const sessionIds = sessions.map(session => session.id);
  const cta = countSessions(sessionIds, events, 'cta_click');
  const freeOnline = countWhere(item => item.outcome.freeOnline);
  const onlineAbandoned = countWhere(item => item.outcome.onlineAbandoned);
  const onlinePaid = countWhere(item => item.outcome.onlinePaid);
  const inpersonPaid = countWhere(item => item.outcome.inpersonPaid);
  const inpersonStarted = countWhere(item => item.outcome.inpersonStarted);
  const onlineCompleted = freeOnline + onlinePaid;
  const onlineStartedRecords = onlineCompleted + onlineAbandoned;
  const onlineForm = atLeast(countPathSessions(sessionIds, events, 'online', 'start'), onlineStartedRecords);
  const onlineSubmit = atLeast(countPathSessions(sessionIds, events, 'online', 'submit'), onlineStartedRecords);
  const inpersonForm = atLeast(countPathSessions(sessionIds, events, 'inperson', 'start'), inpersonStarted);
  const inpersonSubmit = atLeast(countPathSessions(sessionIds, events, 'inperson', 'submit'), inpersonStarted);
  const inpersonPaymentEvents = countSessions(sessionIds, events, 'payment_start', 'inperson');
  const devices = ['mobile', 'tablet', 'desktop', 'unknown'].map(key => ({
    key,
    label: DEVICE_LABELS[key],
    count: sessions.filter(session => (session.device_type || 'unknown') === key).length,
  })).filter(item => item.count > 0);
  const buckets = [
    { label: '10 秒內', count: dwells.filter(value => value < 10).length },
    { label: '10–30 秒', count: dwells.filter(value => value >= 10 && value < 30).length },
    { label: '30 秒–2 分', count: dwells.filter(value => value >= 30 && value < 120).length },
    { label: '2 分以上', count: dwells.filter(value => value >= 120).length },
  ];
  const sourceMap = new Map<string, { label: string; campaign: string | null; rows: SessionRow[] }>();
  for (const session of sessions) {
    const label = sourceLabel(session);
    const campaign = session.utm_campaign || null;
    const key = `${label}\n${campaign || ''}`;
    const current = sourceMap.get(key) || { label, campaign, rows: [] };
    current.rows.push(session);
    sourceMap.set(key, current);
  }
  const sources = [...sourceMap.values()].map(group => {
    const ids = group.rows.map(session => session.id);
    const totalDwell = group.rows.reduce((sum, session) => sum + dwellSeconds(session, events), 0);
    return {
      label: group.label,
      campaign: group.campaign,
      sessions: group.rows.length,
      averageDwellSeconds: group.rows.length ? Math.round(totalDwell / group.rows.length) : 0,
      cta: countSessions(ids, events, 'cta_click'),
      formStart: countSessions(ids, events, 'form_start'),
      submit: ids.filter(id => events.some(event => event.session_id === id && SUBMIT_EVENTS.has(event.event_name))).length,
      paymentStart: countSessions(ids, events, 'payment_start'),
    };
  }).sort((left, right) => right.sessions - left.sessions || left.label.localeCompare(right.label, 'zh-Hant'));
  const hourly = input.days === 1;
  const trendKeys = enumerateBuckets(input.since, input.days, input.now ?? Date.now());
  const trendMap = new Map(trendKeys.map(key => [key, { label: bucketLabel(key, hourly), visits: 0, formStarts: 0, completions: 0 }]));
  for (const session of sessions) {
    const current = trendMap.get(bucketKey(session.started_at, hourly));
    if (current) current.visits += 1;
  }
  for (const event of events) {
    if (event.event_name !== 'form_start') continue;
    const current = trendMap.get(bucketKey(event.occurred_at, hourly));
    if (current) current.formStarts += 1;
  }
  for (const item of classified) {
    if (!item.outcome.freeOnline && !item.outcome.onlinePaid && !item.outcome.inpersonPaid) continue;
    const at = item.outcome.freeOnline
      ? item.application.createdAt
      : item.application.orders.find(isPaid399)?.paidAt || item.application.createdAt;
    const current = trendMap.get(bucketKey(at, hourly));
    if (current) current.completions += 1;
  }
  const trend = trendKeys.map(key => trendMap.get(key)!);
  const scrollBuckets = [
    { label: '25%', count: sessions.filter(session => Number(session.max_scroll_depth || 0) >= 25).length },
    { label: '50%', count: sessions.filter(session => Number(session.max_scroll_depth || 0) >= 50).length },
    { label: '75%', count: sessions.filter(session => Number(session.max_scroll_depth || 0) >= 75).length },
    { label: '90%', count: sessions.filter(session => Number(session.max_scroll_depth || 0) >= 90).length },
  ];
  const eventLabels: Record<string, string> = {
    page_view: '頁面瀏覽',
    cta_click: '點擊報名',
    form_start: '開始填表',
    form_submit: '送出表單',
    form_submit_ok: '送出成功',
    payment_start: '前往付款',
  };
  const eventCounts = Object.entries(eventLabels).map(([key, label]) => ({
    key,
    label,
    count: events.filter(event => event.event_name === key).length,
  }));
  const offerPerformance = [
    { key: 'online', name: '線上前導課', starts: onlineForm, submits: onlineSubmit, completions: freeOnline + onlinePaid },
    { key: 'inperson', name: '實體課（台北）', starts: inpersonForm, submits: inpersonSubmit, completions: inpersonPaid },
  ];
  const allPayments = classified.flatMap(item => item.application.orders.filter(order => !isTestOrder(order)).map(order => ({
    at: order.paidAt || order.createdAt,
    orderNo: order.orderNo,
    amount: order.amount,
    status: order.status === 'paid' ? '已付款' : '未完成',
    session: displaySession(item.application.sessionCode),
    name: item.application.name,
  }))).sort((left, right) => right.at.localeCompare(left.at));
  const payments = allPayments.slice(0, 20);
  const allRegistrations = classified
    .sort((left, right) => right.application.createdAt.localeCompare(left.application.createdAt))
    .map(item => ({
      createdAt: item.application.createdAt,
      name: item.application.name,
      email: item.application.email,
      phone: item.application.phone,
      session: displaySession(item.application.sessionCode),
      result: item.outcome.result,
      source: item.application.attribution?.source || null,
    }));
  const sourceCounts = new Map<string, number>();
  for (const item of classified) {
    if (item.outcome.result === '測試單') continue;
    const label = item.application.attribution?.source || '未記錄（較早報名）';
    sourceCounts.set(label, (sourceCounts.get(label) || 0) + 1);
  }
  const registrationSources = [...sourceCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
  // 其他場次通知: the same person (email, else phone) counts once.
  const notifyItems = classified.filter(item => item.outcome.notify);
  const notifyPeople = new Set(notifyItems.map(item => (item.application.email || '').trim().toLowerCase() || (item.application.phone || '').replace(/\D/g, '')));
  // Confirmation email: one rule for free online signups and paid (non-test) orders.
  const visibleIds = new Set(visibleApplications.map(application => application.id));
  const reportNow = input.now ?? Date.now();
  let emailFailed = 0;
  let emailPending = 0;
  for (const row of input.emailStatuses || []) {
    if (!visibleIds.has(row.application_id)) continue;
    const status = emailState(row, reportNow);
    if (status === 'failed') emailFailed += 1;
    else if (status === 'pending') emailPending += 1;
  }
  return {
    days: input.days,
    since: input.since,
    fixture: input.fixture,
    analyticsUnavailable: input.analyticsUnavailable,
    registrationsUnavailable: input.registrationsUnavailable,
    trackingStartedAt: input.trackingStartedAt || null,
    sessionsCapped: Boolean(input.sessionsCapped),
    eventsCapped: Boolean(input.eventsCapped),
    registrationsTotal: allRegistrations.length,
    paymentsTotal: allPayments.length,
    kpis: {
      sessions: sessions.length,
      visitors: new Set(sessions.map(session => session.visitor_id)).size,
      averageDwellSeconds: dwells.length ? Math.round(dwells.reduce((sum, value) => sum + value, 0) / dwells.length) : 0,
      medianDwellSeconds: median(dwells),
      averageScroll: sessions.length ? Math.round(sessions.reduce((sum, session) => sum + Number(session.max_scroll_depth || 0), 0) / sessions.length) : 0,
      freeOnline,
      onlineAbandoned,
      onlinePaid,
      onlinePaidAmount: sumPaid(item => item.outcome.onlinePaid),
      inpersonPaid,
      inpersonPaidAmount: sumPaid(item => item.outcome.inpersonPaid),
      inpersonPaid1216: countWhere(item => item.outcome.inpersonPaid && isDecember16(item.application.sessionCode)),
      inpersonPaid1223: countWhere(item => item.outcome.inpersonPaid && isDecember23(item.application.sessionCode)),
      inpersonStarted,
      notify: notifyPeople.size,
      notifyRecords: notifyItems.length,
      emailFailed,
      emailPending,
      excludedTestOrders: visibleApplications.reduce((sum, application) => sum + application.orders.filter(isTestOrder).length, 0),
      excludedTestNames: excludedApplications.length,
    },
    devices,
    dwellBuckets: buckets,
    sources,
    funnels: {
      online: raiseToDownstream([
        { label: '進站', count: sessions.length, basis: 'sessions' },
        { label: '點擊報名', count: cta, basis: 'sessions' },
        { label: '開始填寫線上', count: onlineForm, basis: 'sessions' },
        { label: '送出線上表單', count: onlineSubmit, basis: 'sessions' },
        { label: '完成免費登記', count: freeOnline, basis: 'records', detail: `另有線上未完成付款 ${onlineAbandoned}、線上已付款 ${onlinePaid}` },
      ]),
      inperson: raiseToDownstream([
        { label: '進站', count: sessions.length, basis: 'sessions' },
        { label: '點擊報名', count: cta, basis: 'sessions' },
        { label: '開始填寫實體', count: inpersonForm, basis: 'sessions' },
        { label: '送出實體表單', count: inpersonSubmit, basis: 'sessions' },
        { label: '前往付款', count: inpersonStarted, basis: 'records', detail: `瀏覽器記錄到 ${inpersonPaymentEvents} 個工作階段前往付款` },
        { label: '付款完成', count: inpersonPaid, basis: 'records', detail: '以訂單狀態為準，含這段期間才付完的較早報名' },
      ]),
    },
    registrations: allRegistrations.slice(0, 20),
    registrationSources,
    payments,
    periodCaption: formatTaipeiRange(input.since, input.now ?? Date.now()),
    trend,
    scrollBuckets,
    eventCounts,
    offerPerformance,
    excludedTests: excludedClassified
      .sort((left, right) => right.application.createdAt.localeCompare(left.application.createdAt))
      .map(item => toExcludedRow(item.application, item.outcome.result)),
  };
}

export const SESSION_FETCH_LIMIT = 5000;
export const EVENT_FETCH_LIMIT = 20000;

export async function loadReport(days: number, now = Date.now()): Promise<DashboardReport> {
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_DASHBOARD_FIXTURE === '1') return fixtureReport(days, now);
  const since = windowStart(days, now);
  let sessions: SessionRow[] = [];
  let events: EventRow[] = [];
  let analyticsUnavailable = false;
  let registrationsUnavailable = false;
  let applications: GroupedApplication[] = [];
  let trackingStartedAt: string | null = null;
  let sessionsCapped = false;
  let eventsCapped = false;
  try {
    await ensureAnalyticsTables();
    const earliest = await db().query(
      'SELECT MIN(started_at) AS started_at FROM site_sessions',
    ) as { started_at: string | null }[];
    const firstStarted = earliest[0]?.started_at || null;
    if (firstStarted && Date.parse(since) < Date.parse(firstStarted)) trackingStartedAt = firstStarted;
    sessions = await db().query(
      `SELECT id, visitor_id, started_at, last_seen_at, referrer, device_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, max_scroll_depth, last_stage
       FROM site_sessions WHERE started_at >= $1 ORDER BY started_at DESC LIMIT ${SESSION_FETCH_LIMIT}`,
      [since],
    ) as SessionRow[];
    events = await db().query(
      `SELECT session_id, event_name, offer, event_data, occurred_at FROM site_events WHERE occurred_at >= $1 AND event_name <> 'dwell_ping' ORDER BY occurred_at DESC LIMIT ${EVENT_FETCH_LIMIT}`,
      [since],
    ) as EventRow[];
    sessionsCapped = sessions.length >= SESSION_FETCH_LIMIT;
    eventsCapped = events.length >= EVENT_FETCH_LIMIT;
  } catch {
    analyticsUnavailable = true;
  }
  try {
    const rows = await db().query(
      `SELECT a.id, a.name, a.email, a.phone, a.session_code, a.created_at,
              o.id AS order_id, o.order_no, o.amount, o.status, o.source, o.paid_at, o.created_at AS order_created_at
       FROM applications a
       LEFT JOIN payment_orders o ON o.application_id = a.id
       WHERE a.created_at >= $1 OR (o.paid_at IS NOT NULL AND o.paid_at >= $1)
       ORDER BY a.created_at DESC
       LIMIT 2000`,
      [since],
    ) as JoinRow[];
    applications = groupApplications(rows);
  } catch {
    registrationsUnavailable = true;
  }
  const sources = await loadAttributionSources(since);
  for (const application of applications) application.attribution = sources.get(application.id) || null;
  const emailStatuses: EmailStatusRow[] = [];
  try {
    const rows = await db().query(
      `SELECT application_id, email_status, email_lease FROM payment_orders
       WHERE status = 'paid' AND source <> 'win-test-1' AND paid_at >= $1`,
      [since],
    ) as Omit<EmailStatusRow, 'kind'>[];
    for (const row of rows) emailStatuses.push({ ...row, kind: 'order' });
  } catch { /* counted as zero */ }
  try {
    const rows = await db().query(
      'SELECT application_id, email_status, email_lease FROM online_signups WHERE created_at >= $1',
      [since],
    ) as Omit<EmailStatusRow, 'kind'>[];
    for (const row of rows) emailStatuses.push({ ...row, kind: 'online' });
  } catch { /* table is created on first free signup */ }
  return buildReport({ days, since, sessions, events, applications, analyticsUnavailable, registrationsUnavailable, fixture: false, trackingStartedAt, sessionsCapped, eventsCapped, emailStatuses, now });
}

export async function loadExcludedTestRegistrations(now = Date.now()): Promise<ExcludedTestRow[]> {
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_DASHBOARD_FIXTURE === '1') {
    return fixtureReport(30, now).excludedTests;
  }
  try {
    const rows = await db().query(
      `SELECT a.id, a.name, a.email, a.phone, a.session_code, a.created_at,
              o.id AS order_id, o.order_no, o.amount, o.status, o.source, o.paid_at, o.created_at AS order_created_at
       FROM applications a
       LEFT JOIN payment_orders o ON o.application_id = a.id
       ORDER BY a.created_at DESC
       LIMIT 5000`,
    ) as JoinRow[];
    return groupApplications(rows)
      .filter(application => isExcludedTestName(application.name))
      .map(application => {
        const outcome = classifyApplication(application.sessionCode, application.orders);
        return toExcludedRow(application, outcome.result);
      });
  } catch {
    return [];
  }
}
