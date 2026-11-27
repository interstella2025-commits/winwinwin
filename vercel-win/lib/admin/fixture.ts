import { buildReport, type EventRow, type GroupedApplication, type SessionRow } from './report';

const ONLINE = '線上課|2026-12-06（日）|20:00–21:30';
const DAY16 = '實體課（台北場），2026 年 12 月 16 日（三）13:00–16:00（台灣時間）';
const DAY23 = '實體課（台北場），2026 年 12 月 23 日（三）13:00–16:00（台灣時間）';

const SOURCES = [
  { utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'win-precourse', referrer: 'https://facebook.com', device_type: 'mobile' },
  { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'lecturer', referrer: 'https://www.google.com', device_type: 'desktop' },
  { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, device_type: 'mobile' },
  { utm_source: null, utm_medium: null, utm_campaign: null, referrer: 'https://line.me', device_type: 'mobile' },
  { utm_source: 'instagram', utm_medium: 'paid', utm_campaign: 'win-precourse', referrer: 'https://instagram.com', device_type: 'tablet' },
];

function iso(now: number, hoursAgo: number) {
  return new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
}

function person(index: number, sessionCode: string | null, createdAt: string, orders: GroupedApplication['orders']): GroupedApplication {
  return {
    id: `fixture-app-${index}`,
    name: ['陳安', '林可', '周寧', '張以', '黃書', '吳澄', '蔡里', '許安', '丁川'][index] || `訪客${index}`,
    email: `fixture${index}@example.test`,
    phone: `+88690000000${index}`,
    sessionCode,
    createdAt,
    orders,
  };
}

export function fixtureReport(days: number, now = Date.now()) {
  const since = new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
  const sessions: SessionRow[] = [];
  const events: EventRow[] = [];
  for (let index = 0; index < 24; index += 1) {
    const source = SOURCES[index % SOURCES.length];
    const id = `fixture-session-${index}`;
    const started = iso(now, 2 + (index % 18));
    const dwell = [8, 18, 46, 75, 140, 210][index % 6];
    const depth = [10, 25, 50, 75, 90][index % 5];
    sessions.push({
      id,
      visitor_id: `fixture-visitor-${index % 20}`,
      started_at: started,
      last_seen_at: new Date(Date.parse(started) + dwell * 1000).toISOString(),
      referrer: source.referrer,
      device_type: source.device_type,
      utm_source: source.utm_source,
      utm_medium: source.utm_medium,
      utm_campaign: source.utm_campaign,
      utm_content: null,
      utm_term: null,
      max_scroll_depth: depth,
      last_stage: 'page_view',
    });
    const push = (name: string, offer: string | null, extra = 0) => {
      events.push({ session_id: id, event_name: name, offer, event_data: '{}', occurred_at: new Date(Date.parse(started) + extra * 1000).toISOString() });
    };
    push('page_view', null);
    if (index < 16) push('cta_click', null, 5);
    if (index < 7) push('form_start', 'online', 12);
    if (index < 4) push('form_submit_ok', 'online', 30);
    if (index >= 7 && index < 12) push('form_start', 'inperson', 12);
    if (index >= 7 && index < 10) push('form_submit_ok', 'inperson', 30);
    if (index >= 7 && index < 10) push('payment_start', 'inperson', 40);
    push('session_end', null, dwell);
  }
  const applications = [
    person(0, ONLINE, iso(now, 5), []),
    person(1, ONLINE, iso(now, 6), []),
    person(2, ONLINE, iso(now, 8), []),
    person(3, ONLINE, iso(now, 4), [{ orderNo: 'WINONLINEPEND', amount: 399, status: 'pending', source: 'https://2027course.win-lin.com/#apply', paidAt: null, createdAt: iso(now, 4) }]),
    person(4, ONLINE, iso(now, 30), [{ orderNo: 'WINONLINEPAID', amount: 399, status: 'paid', source: 'https://2027course.win-lin.com/#apply', paidAt: iso(now, 9), createdAt: iso(now, 30) }]),
    person(5, DAY16, iso(now, 3), [{ orderNo: 'WIN1216PAID', amount: 399, status: 'paid', source: 'https://2027course.win-lin.com/#apply', paidAt: iso(now, 3), createdAt: iso(now, 3) }]),
    person(6, DAY23, iso(now, 7), [{ orderNo: 'WIN1223PAID', amount: 399, status: 'paid', source: 'https://2027course.win-lin.com/#apply', paidAt: iso(now, 7), createdAt: iso(now, 7) }]),
    person(7, DAY16, iso(now, 2), [{ orderNo: 'WIN1216PEND', amount: 399, status: 'pending', source: 'https://2027course.win-lin.com/#apply', paidAt: null, createdAt: iso(now, 2) }]),
    person(8, 'notify', iso(now, 10), []),
    person(9, ONLINE, iso(now, 1), [{ orderNo: 'WINTEST', amount: 1, status: 'paid', source: 'win-test-1', paidAt: iso(now, 1), createdAt: iso(now, 1) }]),
    {
      id: 'fixture-app-elsa',
      name: 'elsa測試',
      email: 'elsa-test@example.test',
      phone: '+886900000091',
      sessionCode: ONLINE,
      createdAt: iso(now, 2),
      orders: [],
    },
    {
      id: 'fixture-app-liao',
      name: ' 廖子淇 ',
      email: 'liao-test@example.test',
      phone: '+886900000092',
      sessionCode: DAY16,
      createdAt: iso(now, 2.5),
      orders: [{ orderNo: 'WINTESTNAME', amount: 399, status: 'paid', source: 'https://2027course.win-lin.com/#apply', paidAt: iso(now, 2.5), createdAt: iso(now, 2.5) }],
    },
    {
      id: 'fixture-app-friend',
      name: '陳好友',
      email: 'friend@example.test',
      phone: '+886900000093',
      sessionCode: ONLINE,
      createdAt: iso(now, 3.5),
      orders: [],
    },
  ];
  const visibleSessions = sessions.filter(session => session.started_at >= since);
  const visibleIds = new Set(visibleSessions.map(session => session.id));
  return buildReport({
    days,
    since,
    sessions: visibleSessions,
    events: events.filter(event => visibleIds.has(event.session_id) && event.occurred_at >= since),
    applications: applications.filter(application => application.createdAt >= since || application.orders.some(order => (order.paidAt || '') >= since)),
    analyticsUnavailable: false,
    registrationsUnavailable: false,
    fixture: true,
  });
}
