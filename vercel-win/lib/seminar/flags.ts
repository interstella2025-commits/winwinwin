type Env = Record<string, string | undefined>;

/** 整個說明會模板的開關。沒有設成 1，所有 /seminar 頁面和 API 都是 404，正式站行為不變。 */
export function seminarEnabled(env: Env = process.env) {
  return env.SEMINAR_TEMPLATE_ENABLED === '1';
}

/** 示範模式只在非正式環境有效。 */
export function demoAllowed(env: Env = process.env) {
  return env.VERCEL_ENV !== 'production';
}

/** 刷卡只有在三個條件都成立時才會真的建立訂單：開關打開、資料庫儲存、金流金鑰存在。 */
export function checkoutLive(env: Env = process.env) {
  return env.SEMINAR_CHECKOUT_ENABLED === '1' && env.SEMINAR_STORE === 'postgres' && Boolean(env.PAYUNI_MER_ID && env.PAYUNI_HASH_KEY && env.PAYUNI_HASH_IV);
}

/** 刷卡測試金額。只接受 1，用來做 NT$1 驗收。 */
export function testAmount(env: Env = process.env) {
  return env.SEMINAR_CARD_TEST_AMOUNT === '1' ? 1 : null;
}

/** 寄信開關。預覽預設關閉，不會寄信給任何人。 */
export function emailEnabled(env: Env = process.env) {
  return env.SEMINAR_EMAIL_ENABLED === '1' && Boolean(env.RESEND_API_KEY);
}

export function siteOrigin(env: Env = process.env) {
  return (env.SEMINAR_PUBLIC_ORIGIN || 'https://2027course.win-lin.com').replace(/\/$/, '');
}
