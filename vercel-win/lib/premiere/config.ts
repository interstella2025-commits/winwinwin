/**
 * 首播說明會的時間、顯示價格與畫面上的句子都在這一個檔案。
 * 標成「【待 Elsa 確認】」的文字還不是定稿，請負責人改完再開放付款。
 *
 * 畫面上的價格只負責顯示。真正扣款的金額在舊 Sites 後端的商品允許清單，
 * 不接受瀏覽器傳來的金額。兩邊目前都應為 39800。
 */
export const PREMIERE = {
  id: '2026-11-03',
  /** 首播自己的場次代碼，不是前導課那四個場次。舊後端只在 fullcourse 接受這個代碼。 */
  sessionCode: 'premiere-2026-11-03',
  /** 首播開始：2026-11-03 19:30（台北時間）。 */
  startAt: '2026-11-03T19:30:00+08:00',
  /** 【待 Elsa 確認】影片長度（秒）。預設 90 分鐘。 */
  durationSeconds: 90 * 60,
  /** 【待 Elsa 確認】購買按鈕出現的時間。預設開播後 60 分鐘。 */
  offerAt: '2026-11-03T20:30:00+08:00',
  /** 顯示用價格（新台幣元）。實際扣款以後端 fullcourse 允許清單為準。 */
  priceTwd: 39800,
  productCode: 'fullcourse' as const,
  /** 跟舊後端 fullcourse 的刷卡頁名稱同一句。還有「待 Elsa 確認」時，付款按鈕不會打開。 */
  gatewayName: '【待 Elsa 確認】WIN 講師班正式課程',
  copy: {
    eyebrow: '定時播映',
    title: '【待 Elsa 確認】首播說明會',
    lead: '【待 Elsa 確認】這是一場定時播映的說明會。播放進度依照伺服器時間，不能快轉，也不能從頭重看已經播過的部分。',
    countdown: '距離首播開始',
    playing: '定時播映中',
    endedTitle: '【待 Elsa 確認】本場首播已結束',
    endedBody: '【待 Elsa 確認】感謝你的參與。',
    unmute: '點一下開啟聲音',
    startPlayback: '點一下開始播放',
    videoMissing: '影片尚未設定，請稍後再來。',
    videoError: '影片暫時無法播放，請重新整理頁面。',
    progressLabel: '播放進度',
    registerTitle: '留下聯絡方式',
    registerLead: '【待 Elsa 確認】留下姓名與 Email，方便課後聯繫。這一步不會付款，也不會建立訂單。',
    registerButton: '登記這場首播',
    registerDone: '已登記。這一步還沒有付款。',
    registerEndedTitle: '【待 Elsa 確認】登記已結束',
    registerEndedBody: '【待 Elsa 確認】本場首播已結束，這一頁不再接受新的登記。',
    registerUnavailable: '報名服務尚未開放，仍可先觀看首播。',
    registerError: '暫時無法登記，請稍後再試。',
    purchaseTitle: '【待 Elsa 確認】正式課程',
    purchaseLead: '【待 Elsa 確認】以下課程說明、價格呈現與退費條款都尚未定稿。',
    purchaseButton: '【待 Elsa 確認】前往付款',
    checkoutClosed: '【待 Elsa 確認】正式課程報名即將開放',
    checkoutEnded: '【待 Elsa 確認】本場首播已結束。',
    offerLocked: '【待 Elsa 確認】正式課程的報名按鈕會在首播進行到指定時間後出現。',
    terms: '【待 Elsa 確認】退費辦法、課程內容與合約條款尚未定稿。正式開放付款前，請負責人改寫這段文字。',
    consent: '【待 Elsa 確認】我已閱讀上方尚未定稿的說明，並同意提供姓名、手機與 Email，供這次報名及付款使用。',
    backHome: '回到課程頁',
  },
  payment: {
    productLine: '【待 Elsa 確認】WIN 講師班正式課程',
    paidTitle: '【待 Elsa 確認】正式課程付款成功',
    paidBody: '【待 Elsa 確認】已收到正式課程款項。後續通知方式尚未定稿。',
    note: '【待 Elsa 確認】此付款結果頁的正式課程說明尚未定稿。',
  },
} as const;
