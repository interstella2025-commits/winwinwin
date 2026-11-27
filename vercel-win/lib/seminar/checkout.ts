import { randomBytes } from 'node:crypto';
import { VERSION, config as payuniConfig, decode, encrypt, escape, hash } from '../payuni/core';
import { siteOrigin, testAmount } from './flags';
import { store } from './store';
import type { SeminarConfig } from './types';

/**
 * 說明會的刷卡流程。沿用既有 PAYUNi 加解密（lib/payuni/core），但有自己的訂單紀錄與回傳網址，
 * 不經過、也不改動前導課的 /api/payuni/* 與 payment_orders。
 * 金額只取伺服器上的設定（或 NT$1 測試），不接受瀏覽器傳來的金額。
 */
export type SeminarOrder = { orderNo: string; token: string; amount: number; status: 'pending' | 'paid' | 'failed'; productCode: string; productName: string; name: string; email: string; phone: string; merchant: string; tradeNo?: string; test: boolean };

export function orderAmount(cfg: SeminarConfig) { return testAmount() ?? cfg.cta.priceTwd; }

export async function createOrder(cfg: SeminarConfig, person: { name: string; email: string; phone: string }) {
  const c = payuniConfig(process.env);
  const amount = orderAmount(cfg);
  if (!Number.isInteger(amount) || amount < 1) throw new Error('price');
  const orderNo = `SEM${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`.slice(0, 20);
  const token = randomBytes(24).toString('base64url');
  const data: SeminarOrder = { orderNo, token, amount, status: 'pending', productCode: cfg.cta.target || cfg.slug, productName: `${cfg.cta.productName} ${cfg.cta.productLine}`.trim(), ...person, merchant: c.merchant, test: amount === 1 };
  await store().add(cfg.slug, 'order', data);
  return data;
}

export async function findOrder(field: 'token' | 'orderNo', value: string) {
  const all = await store().list<SeminarOrder>(null, 'order', 20_000);
  return all.find(r => r.data[field] === value) ?? null;
}

export function payuniForm(order: SeminarOrder, slug: string) {
  const c = payuniConfig(process.env);
  const origin = siteOrigin();
  const desc = order.test ? `${order.productName}（NT$1 驗收測試）` : order.productName;
  const EncryptInfo = encrypt({ MerID: c.merchant, Timestamp: Math.floor(Date.now() / 1000), MerTradeNo: order.orderNo, TradeAmt: order.amount, ProdDesc: desc.slice(0, 80), ReturnURL: `${origin}/api/seminar/payuni/return`, NotifyURL: `${origin}/api/seminar/payuni/notify`, BackURL: `${origin}/seminar/${slug}?order=${order.token}`, Credit: 1, TradeLExpireSec: 600, Lang: 'zh-tw' }, c);
  const fields = { MerID: c.merchant, Version: VERSION, EncryptInfo, HashInfo: hash(EncryptInfo, c) };
  const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>前往安全付款</title><body style="font-family:sans-serif;padding:32px"><p>${escape(desc)}｜NT$${order.amount}</p><p>即將前往付款頁面…</p><form id="pay" method="POST" action="${c.endpoint}">${Object.entries(fields).map(([k, v]) => `<input type="hidden" name="${k}" value="${escape(String(v))}">`).join('')}<button>前往安全付款</button></form><script>document.getElementById('pay').submit()</script></body></html>`;
  return { html, endpoint: c.endpoint };
}

/** 驗證 PAYUNi 回傳：簽章、商店、訂單編號、金額都要對上，才標成已付款。 */
export async function settle(fields: Record<string, string>) {
  const c = payuniConfig(process.env);
  const data = decode(fields, c);
  const rec = await findOrder('orderNo', data.MerTradeNo || '');
  if (!rec) throw new Error('order');
  const o = rec.data;
  if (o.merchant !== c.merchant || Number(data.TradeAmt) !== o.amount) throw new Error('mismatch');
  const status = data.TradeStatus === '1' ? 'paid' : ['2', '3', '4'].includes(data.TradeStatus) ? 'failed' : 'pending';
  if (o.status !== 'paid') await store().update<SeminarOrder>(rec.id, { status, tradeNo: data.TradeNo || '' });
  return { rec, status, newlyPaid: o.status !== 'paid' && status === 'paid' };
}
