import { NOTIFY_CODE, isInPersonCode, sessionLabel } from '../course-sessions';

export type Offer = 'online' | 'inperson' | 'notify' | 'unknown';

export type OrderFact = {
  orderNo: string;
  amount: number;
  status: string;
  source: string;
  paidAt: string | null;
  createdAt: string;
};

export type ApplicationOutcome = {
  offer: Offer;
  freeOnline: boolean;
  onlineAbandoned: boolean;
  onlinePaid: boolean;
  inpersonPaid: boolean;
  inpersonStarted: boolean;
  notify: boolean;
  result: string;
};

export function offerFromSessionCode(code: string | null | undefined): Offer {
  if (!code) return 'unknown';
  if (code === NOTIFY_CODE) return 'notify';
  if (isInPersonCode(code)) return 'inperson';
  if (code.startsWith('線上') || /^20\d{2}-\d{2}-\d{2}/.test(code) || Boolean(sessionLabel(code))) return 'online';
  return 'unknown';
}

export function isDecember16(code: string | null | undefined) {
  if (!code) return false;
  return code.includes('12 月 16') || code.includes('12/16') || code.includes('2026-12-16');
}

export function isTestOrder(order: OrderFact) {
  return order.source === 'win-test-1';
}

export function isPaid399(order: OrderFact) {
  return !isTestOrder(order) && order.status === 'paid' && Number(order.amount) === 399;
}

export function classifyApplication(sessionCode: string | null, orders: OrderFact[]): ApplicationOutcome {
  const offer = offerFromSessionCode(sessionCode);
  const real = orders.filter(order => !isTestOrder(order));
  const paid = real.filter(isPaid399);
  const onlyTest = orders.length > 0 && real.length === 0;
  const freeOnline = offer === 'online' && orders.length === 0;
  const onlinePaid = offer === 'online' && paid.length > 0;
  const onlineAbandoned = offer === 'online' && real.length > 0 && paid.length === 0;
  const inpersonPaid = offer === 'inperson' && paid.length > 0;
  const inpersonStarted = offer === 'inperson' && real.length > 0;
  const notify = offer === 'notify';
  let result = '未分類';
  if (onlyTest) result = '測試單';
  else if (freeOnline) result = '免費登記';
  else if (onlinePaid) result = '線上已付款';
  else if (onlineAbandoned) result = '線上未完成付款';
  else if (inpersonPaid) result = '實體已付款';
  else if (inpersonStarted) result = '實體未完成付款';
  else if (offer === 'inperson') result = '實體已送出';
  else if (notify) result = '其他場次通知';
  else if (offer === 'online') result = '線上已送出';
  return { offer, freeOnline, onlineAbandoned, onlinePaid, inpersonPaid, inpersonStarted, notify, result };
}

export function displaySession(code: string | null | undefined) {
  return sessionLabel(code) || (code === NOTIFY_CODE ? '其他場次通知' : code || '未填場次');
}
