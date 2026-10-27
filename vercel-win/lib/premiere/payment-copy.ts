import { PREMIERE } from './config';

/** Locked sentences for the existing NT$399 result page. Full-course orders use PREMIERE.payment instead. */
export const PRECOURSE_PRODUCT = 'WIN 講師班｜90分鐘線上前導課';
export const PRECOURSE_PAID_TITLE = '前導課付款成功';
export const PRECOURSE_PAID_BODY = '已收到你的 NT$399 前導課款項。線上課程的實際安排與上課連結將另行通知。';
export const PRECOURSE_NOTE = '此款項僅為線上前導課，不代表正式講師班錄取或費用。';

export type PaymentResult = {
  status?: string;
  amount?: number;
  isTest?: boolean;
  plan?: string | null;
  productName?: string | null;
  session?: string | null;
} | null;

export type PaymentView = {
  title: string;
  productLine: string | null;
  body: string;
  note: string;
  showSession: boolean;
};

export function resolvePlan(result: { amount?: number; isTest?: boolean; plan?: string | null }) {
  if (result.plan === 'test' || result.plan === 'precourse' || result.plan === 'fullcourse' || result.plan === 'unknown') return result.plan;
  if (result.isTest) return 'test';
  if (result.amount === 399) return 'precourse';
  return 'unknown';
}

export function paymentView(result: PaymentResult, failed = false): PaymentView {
  if (!result) {
    return {
      title: failed ? '無法確認付款結果' : '正在讀取付款結果',
      productLine: null,
      body: '',
      note: '',
      showSession: false,
    };
  }
  const plan = resolvePlan(result);
  const amount = typeof result.amount === 'number' ? `NT$${result.amount}` : '';
  const paid = result.status === 'paid';
  const pending = result.status === 'pending';
  const product = plan === 'precourse'
    ? PRECOURSE_PRODUCT
    : plan === 'test'
      ? 'WIN 金流驗收測試'
      : plan === 'fullcourse'
        ? (result.productName || PREMIERE.payment.productLine)
        : (result.productName || '【待確認】款項');
  const title = plan === 'fullcourse'
    ? (paid ? PREMIERE.payment.paidTitle : pending ? '【待 Elsa 確認】正在確認正式課程付款' : '【待 Elsa 確認】正式課程付款結果')
    : plan === 'unknown'
      ? (paid ? '【待確認】付款已收到' : pending ? '【待確認】正在確認付款' : '【待確認】付款結果')
      : (paid ? (plan === 'test' ? '測試付款成功' : PRECOURSE_PAID_TITLE) : pending ? '正在確認付款結果' : 'WIN 前導課付款結果');
  const body = paid
    ? (plan === 'test'
      ? 'NT$1 測試付款已完成。此為金流驗收，不包含課程報名或席位。'
      : plan === 'fullcourse'
        ? PREMIERE.payment.paidBody
        : plan === 'unknown'
          ? '【待確認】已收到款項。請保留訂單編號，並等候主辦方核對課程方案。'
          : PRECOURSE_PAID_BODY)
    : pending
      ? '正在確認付款結果，請稍候；若已付款，請勿重複付款。'
      : result.status === 'expired'
        ? '這筆付款連結已逾時。若已完成付款，請稍後重新整理查詢。'
        : '目前尚未確認付款成功。若已扣款，請勿重複付款，請保留訂單編號。';
  const note = plan === 'test'
    ? '此為 NT$1 測試付款，不包含課程報名。'
    : plan === 'fullcourse'
      ? PREMIERE.payment.note
      : plan === 'unknown'
        ? '【待確認】這筆訂單的課程方案尚未核對完成。'
        : PRECOURSE_NOTE;
  return {
    title,
    productLine: amount ? `${product} · ${amount}` : product,
    body,
    note,
    showSession: plan === 'precourse' && !result.isTest,
  };
}
