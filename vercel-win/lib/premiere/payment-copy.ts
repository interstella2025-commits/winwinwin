import { PREMIERE } from './config';

/** Locked sentences for the existing NT$399 result page. Full-course orders use PREMIERE.payment instead. */
export const PRECOURSE_PRODUCT = 'WIN 講師班｜90分鐘線上前導課';
export const PRECOURSE_PAID_TITLE = '前導課付款成功';
export const PRECOURSE_PAID_BODY = '已收到你的 NT$399 前導課款項。線上課程的實際安排與上課連結將另行通知。';
export const PRECOURSE_NOTE = '此款項僅為線上前導課，不代表正式講師班錄取或費用。';

export function isFullCourse(result: { amount: number; isTest?: boolean } | null) {
  return !!result && !result.isTest && result.amount !== 399;
}

export function paymentProductLine(result: { amount: number; isTest?: boolean } | null) {
  if (result?.isTest) return 'WIN 金流驗收測試';
  if (isFullCourse(result)) return PREMIERE.payment.productLine;
  return PRECOURSE_PRODUCT;
}

export function paymentPaidTitle(result: { amount: number; isTest?: boolean }) {
  if (result.isTest) return '測試付款成功';
  if (isFullCourse(result)) return PREMIERE.payment.paidTitle;
  return PRECOURSE_PAID_TITLE;
}

export function paymentPaidBody(result: { amount: number; isTest?: boolean }) {
  if (result.isTest) return 'NT$1 測試付款已完成。此為金流驗收，不包含課程報名或席位。';
  if (isFullCourse(result)) return PREMIERE.payment.paidBody;
  return PRECOURSE_PAID_BODY;
}

export function paymentNote(result: { amount: number; isTest?: boolean } | null) {
  if (result?.isTest) return '此為 NT$1 測試付款，不包含課程報名。';
  if (isFullCourse(result)) return PREMIERE.payment.note;
  return PRECOURSE_NOTE;
}
