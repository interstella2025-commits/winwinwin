import { db } from '../payuni/db';
import { classifyApplication, displaySession, isDecember16, isPaid399, isTestOrder, type OrderFact } from './offers';
import { fixtureReport } from './fixture';

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
    inpersonStarted: number;
    notify: number;
    excludedTestOrders: number;
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
  registrations: { createdAt: string; name: string; email: string; phone: string; session: string; result: string }[];
  payments: { at: string; orderNo: string; amount: number; status: string; session: string; name: string }[];
};

const DEVICE_LABELS: Record<string, string> = { mobile: '手機', tablet: '平板', desktop: '桌機', unknown: '未知' };

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

export function sourceLabel(session: { utm_source: string | null; utm_medium: string | null; referrer: string | null }) {
  if (session.utm_source) return [session.utm_source, session.utm_medium].filter(Boolean).join(' / ');
  if (!session.referrer) return '直接進站';
  try {
    return new URL(session.referrer).hostname.replace(/^www\./, '');
  } catch {
    return '其他來源';
  }
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

export function buildReport(input: {
  days: number;
  since: string;
  sessions: SessionRow[];
  events: EventRow[];
  applications: GroupedApplication[];
  analyticsUnavailable: boolean;
  registrationsUnavailable: boolean;
  fixture: boolean;
}): DashboardReport {
  const sessions = input.sessions;
  const events = input.events;
  const dwells = sessions.map(session => dwellSeconds(session, events));
  const classified = input.applications.map(application => ({ application, outcome: classifyApplication(application.sessionCode, application.orders) }));
  const sumPaid = (pick: (item: typeof classified[number]) => boolean, december16 = false) => classified.reduce((sum, item) => {
    if (!pick(item)) return sum;
    if (december16 && !isDecember16(item.application.sessionCode)) return sum;
    return sum + item.application.orders.filter(isPaid399).reduce((inner, order) => inner + order.amount, 0);
  }, 0);
  const countWhere = (pick: (item: typeof classified[number]) => boolean) => classified.filter(pick).length;
  const sessionIds = sessions.map(session => session.id);
  const cta = countSessions(sessionIds, events, 'cta_click');
  const onlineForm = countSessions(sessionIds, events, 'form_start', 'online');
  const onlineSubmit = countSessions(sessionIds, events, 'form_submit_ok', 'online');
  const inpersonForm = countSessions(sessionIds, events, 'form_start', 'inperson');
  const inpersonSubmit = countSessions(sessionIds, events, 'form_submit_ok', 'inperson');
  const inpersonPaymentEvents = countSessions(sessionIds, events, 'payment_start', 'inperson');
  const freeOnline = countWhere(item => item.outcome.freeOnline);
  const onlineAbandoned = countWhere(item => item.outcome.onlineAbandoned);
  const onlinePaid = countWhere(item => item.outcome.onlinePaid);
  const inpersonPaid = countWhere(item => item.outcome.inpersonPaid);
  const inpersonStarted = countWhere(item => item.outcome.inpersonStarted);
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
      submit: countSessions(ids, events, 'form_submit_ok'),
      paymentStart: countSessions(ids, events, 'payment_start'),
    };
  }).sort((left, right) => right.sessions - left.sessions || left.label.localeCompare(right.label, 'zh-Hant'));
  const payments = classified.flatMap(item => item.application.orders.filter(order => !isTestOrder(order)).map(order => ({
    at: order.paidAt || order.createdAt,
    orderNo: order.orderNo,
    amount: order.amount,
    status: order.status === 'paid' ? '已付款' : '未完成',
    session: displaySession(item.application.sessionCode),
    name: item.application.name,
  }))).sort((left, right) => right.at.localeCompare(left.at)).slice(0, 20);
  return {
    days: input.days,
    since: input.since,
    fixture: input.fixture,
    analyticsUnavailable: input.analyticsUnavailable,
    registrationsUnavailable: input.registrationsUnavailable,
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
      inpersonStarted,
      notify: countWhere(item => item.outcome.notify),
      excludedTestOrders: input.applications.reduce((sum, application) => sum + application.orders.filter(isTestOrder).length, 0),
    },
    devices,
    dwellBuckets: buckets,
    sources,
    funnels: {
      online: [
        { label: '進站', count: sessions.length, basis: 'sessions' },
        { label: '點擊報名', count: cta, basis: 'sessions' },
        { label: '開始填寫線上', count: onlineForm, basis: 'sessions' },
        { label: '送出線上表單', count: onlineSubmit, basis: 'sessions' },
        { label: '完成免費登記', count: freeOnline, basis: 'records', detail: `另有線上未完成付款 ${onlineAbandoned}、線上已付款 ${onlinePaid}` },
      ],
      inperson: [
        { label: '進站', count: sessions.length, basis: 'sessions' },
        { label: '點擊報名', count: cta, basis: 'sessions' },
        { label: '開始填寫實體', count: inpersonForm, basis: 'sessions' },
        { label: '送出實體表單', count: inpersonSubmit, basis: 'sessions' },
        { label: '前往付款', count: inpersonStarted, basis: 'records', detail: `瀏覽器記錄到 ${inpersonPaymentEvents} 個工作階段前往付款` },
        { label: '付款完成', count: inpersonPaid, basis: 'records', detail: '以訂單狀態為準，含這段期間才付完的較早報名' },
      ],
    },
    registrations: classified
      .sort((left, right) => right.application.createdAt.localeCompare(left.application.createdAt))
      .slice(0, 20)
      .map(item => ({
        createdAt: item.application.createdAt,
        name: item.application.name,
        email: item.application.email,
        phone: item.application.phone,
        session: displaySession(item.application.sessionCode),
        result: item.outcome.result,
      })),
    payments,
  };
}

export async function loadReport(days: number, now = Date.now()): Promise<DashboardReport> {
  if (process.env.NODE_ENV !== 'production' && process.env.ADMIN_DASHBOARD_FIXTURE === '1') return fixtureReport(days, now);
  const since = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  let sessions: SessionRow[] = [];
  let events: EventRow[] = [];
  let analyticsUnavailable = false;
  let registrationsUnavailable = false;
  let applications: GroupedApplication[] = [];
  try {
    sessions = await db().query(
      `SELECT id, visitor_id, started_at, last_seen_at, referrer, device_type, utm_source, utm_medium, utm_campaign, utm_content, utm_term, max_scroll_depth, last_stage
       FROM site_sessions WHERE started_at >= $1 ORDER BY started_at DESC LIMIT 5000`,
      [since],
    ) as SessionRow[];
    events = await db().query(
      `SELECT session_id, event_name, offer, event_data, occurred_at FROM site_events WHERE occurred_at >= $1 ORDER BY occurred_at DESC LIMIT 20000`,
      [since],
    ) as EventRow[];
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
  return buildReport({ days, since, sessions, events, applications, analyticsUnavailable, registrationsUnavailable, fixture: false });
}
