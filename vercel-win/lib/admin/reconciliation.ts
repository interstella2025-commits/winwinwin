import { AMOUNT, VERSION, config, decode, encrypt, hash, type Config } from '../payuni/core';
import { db } from '../payuni/db';
import { emailState } from './report';
import { isExcludedTestName } from './test-registrations';

/**
 * Read-only PAYUNi reconciliation. Returns counts only: no order numbers, names, emails,
 * phones, trade numbers or keys ever leave this module.
 */

export const PROVIDER_CHECK_LIMIT = 50;
const PENDING_STALE_MS = 30 * 60 * 1000;

type OrderRow = {
  order_no: string;
  amount: number | string;
  status: string;
  source: string | null;
  created_at: string;
  provider_trade_no: string | null;
  email_status: string | null;
  email_lease: number | string | null;
  name: string | null;
  purchase_detail: string | null;
};

export type LocalCounts = {
  orders: number;
  paid: number;
  pending: number;
  failed: number;
  otherStatus: number;
  testOrders: number;
  testNameOrders: number;
  paidMissingProviderTradeNo: number;
  paidWrongAmount: number;
  paidEmailFailed: number;
  paidEmailPending: number;
  pendingOver30Minutes: number;
  paidPurchaseSent: number;
  paidPurchaseFailed: number;
  paidPurchaseMissing: number;
};

export type ProviderCounts = {
  available: boolean;
  checked: number;
  skipped: number;
  matched: number;
  providerPaidLocalNotPaid: number;
  localPaidProviderNotPaid: number;
  statusDiffers: number;
  notFound: number;
  errors: number;
};

export type Reconciliation = {
  since: string;
  generatedAt: string;
  local: LocalCounts;
  provider: ProviderCounts | null;
  note: string;
};

export function countLocal(rows: OrderRow[], now = Date.now()): LocalCounts {
  const counts: LocalCounts = {
    orders: 0, paid: 0, pending: 0, failed: 0, otherStatus: 0, testOrders: 0, testNameOrders: 0,
    paidMissingProviderTradeNo: 0, paidWrongAmount: 0, paidEmailFailed: 0, paidEmailPending: 0,
    pendingOver30Minutes: 0, paidPurchaseSent: 0, paidPurchaseFailed: 0, paidPurchaseMissing: 0,
  };
  for (const row of rows) {
    if (row.source === 'win-test-1') { counts.testOrders += 1; continue; }
    if (isExcludedTestName(row.name)) { counts.testNameOrders += 1; continue; }
    counts.orders += 1;
    if (row.status === 'paid') {
      counts.paid += 1;
      if (!row.provider_trade_no) counts.paidMissingProviderTradeNo += 1;
      if (Number(row.amount) !== AMOUNT) counts.paidWrongAmount += 1;
      const email = emailState({ email_status: row.email_status || 'pending', email_lease: row.email_lease }, now);
      if (email === 'failed') counts.paidEmailFailed += 1;
      else if (email === 'pending') counts.paidEmailPending += 1;
      const purchase = row.purchase_detail;
      if (purchase === 'sent') counts.paidPurchaseSent += 1;
      else if (purchase && purchase.startsWith('failed')) counts.paidPurchaseFailed += 1;
      else counts.paidPurchaseMissing += 1;
    } else if (row.status === 'pending') {
      counts.pending += 1;
      if (now - Date.parse(row.created_at) > PENDING_STALE_MS) counts.pendingOver30Minutes += 1;
    } else if (row.status === 'failed') counts.failed += 1;
    else counts.otherStatus += 1;
  }
  return counts;
}

export function queryEndpoint(c: Config) {
  try {
    const url = new URL(c.endpoint);
    url.pathname = '/api/trade/query';
    url.search = '';
    return url.toString();
  } catch {
    return 'https://api.payuni.com.tw/api/trade/query';
  }
}

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
type ProviderState = 'paid' | 'pending' | 'failed' | 'unknown' | 'not_found' | 'error';

function readTradeStatus(values: Record<string, string>) {
  return values.TradeStatus ?? values['Result[0][TradeStatus]'] ?? values['Result[TradeStatus]'];
}

/** Ask PAYUNi for one order's state. Only the mapped state is returned; raw data is discarded. */
export async function queryProvider(orderNo: string, c: Config, fetcher: Fetcher = fetch): Promise<ProviderState> {
  try {
    const encryptInfo = encrypt({ MerID: c.merchant, MerTradeNo: orderNo, Timestamp: Math.floor(Date.now() / 1000) }, c);
    const body = new URLSearchParams({ MerID: c.merchant, Version: VERSION, EncryptInfo: encryptInfo, HashInfo: hash(encryptInfo, c) });
    const response = await fetcher(queryEndpoint(c), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return 'error';
    const payload = await response.json() as Record<string, string>;
    if (payload.Status && payload.Status !== 'SUCCESS' && !payload.EncryptInfo) return /not.?found|無此|查無/i.test(String(payload.Message || '')) ? 'not_found' : 'error';
    const values = decode({ MerID: payload.MerID, Version: payload.Version || VERSION, EncryptInfo: payload.EncryptInfo, HashInfo: payload.HashInfo }, c);
    const status = readTradeStatus(values);
    if (status === undefined) return 'not_found';
    return status === '1' ? 'paid' : status === '0' ? 'pending' : ['2', '3', '4'].includes(status) ? 'failed' : 'unknown';
  } catch {
    return 'error';
  }
}

const ORDER_QUERY = `SELECT o.order_no, o.amount, o.status, o.source, o.created_at, o.provider_trade_no,
  o.email_status, o.email_lease, a.name, e.detail AS purchase_detail
  FROM payment_orders o
  LEFT JOIN applications a ON a.id = o.application_id
  LEFT JOIN capi_events e ON e.event_key = 'Purchase:' || o.order_no AND e.event_name = 'Purchase'
  WHERE o.created_at >= $1
  ORDER BY o.created_at DESC`;

export async function reconcile(since: string, options: { provider?: boolean; now?: number; fetcher?: Fetcher; env?: NodeJS.ProcessEnv } = {}): Promise<Reconciliation> {
  const now = options.now ?? Date.now();
  let rows: OrderRow[];
  try {
    rows = await db().query(ORDER_QUERY, [since]) as OrderRow[];
  } catch {
    // capi_events may not exist yet on a fresh database.
    rows = await db().query(ORDER_QUERY.replace(/LEFT JOIN capi_events[^\n]*\n/, '').replace(', e.detail AS purchase_detail', ', NULL AS purchase_detail'), [since]) as OrderRow[];
  }
  const local = countLocal(rows, now);
  let provider: ProviderCounts | null = null;
  if (options.provider) {
    provider = { available: false, checked: 0, skipped: 0, matched: 0, providerPaidLocalNotPaid: 0, localPaidProviderNotPaid: 0, statusDiffers: 0, notFound: 0, errors: 0 };
    let c: Config | null = null;
    try { c = config(options.env ?? process.env); } catch { c = null; }
    if (c) {
      provider.available = true;
      const candidates = rows.filter(row => row.source !== 'win-test-1' && !isExcludedTestName(row.name));
      provider.skipped = Math.max(0, candidates.length - PROVIDER_CHECK_LIMIT);
      for (const row of candidates.slice(0, PROVIDER_CHECK_LIMIT)) {
        const state = await queryProvider(row.order_no, c, options.fetcher);
        provider.checked += 1;
        if (state === 'error') { provider.errors += 1; continue; }
        if (state === 'not_found') { provider.notFound += 1; continue; }
        if (state === row.status) provider.matched += 1;
        else if (state === 'paid') provider.providerPaidLocalNotPaid += 1;
        else if (row.status === 'paid') provider.localPaidProviderNotPaid += 1;
        else provider.statusDiffers += 1;
      }
    }
  }
  return {
    since,
    generatedAt: new Date(now).toISOString(),
    local,
    provider,
    note: '只回傳筆數，不含訂單編號或個資。測試單（NT$1）與測試姓名另計、不列入比對。PAYUNi 比對最多查最近 50 筆；尚未付款而未在 PAYUNi 建立交易的訂單會列為「查無」。',
  };
}
