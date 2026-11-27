import type { SeminarConfig } from '../types';
import { defaultNotify } from '../defaults';

/**
 * WIN講師班 範例設定。只用 WIN 既有素材，沒有編造數字或見證。
 * 影片先用公開測試影片，之後換成講師班自己的說明會影片。
 * 價格、場次時間仍需 Elsa 確認後才能開放付款。
 */
export const winLecturerSeminar: SeminarConfig = {
  slug: 'win-lecturer',
  kind: 'project',
  brand: { name: 'Expert to Enterprise WIN講師班', mark: 'EXPERT TO ENTERPRISE' },
  theme: { bg: '#0b1528', surface: '#12203a', ink: '#f5f2ea', muted: '#bcc4d3', accent: '#e2be6e', line: '#24345a', onAccent: '#14110b' },
  copy: {
    eyebrow: '線上說明會',
    titleLines: ['Expert to Enterprise', 'WIN講師班 說明會'],
    subtitle: '銷講・招商・募資實戰｜從專家到企業家',
    hook: '想讓專業變企業，就從這場說明會開始。',
    endedTitle: '說明會已結束，謝謝你看到最後。',
    endedBody: '你存下的筆記，會寄到你留下的 Email 或 LINE。',
    offerClosedTitle: '這場說明會的限定方案已結束。',
    offerClosedBody: '想了解下一梯，歡迎用 LINE 問我們。',
  },
  speaker: { name: '林嘉宏 WIN博士', title: '美國瑪麗伍德大學 台灣項目教授', avatar: '/images/seminar/win-avatar.webp' },
  cover: '/images/revision/stage-singapore.webp',
  highlights: [
    { title: '專業變現的商業語言', body: '同一事業，三種提案邏輯。' },
    { title: '一個核心，三種關鍵提案', body: '銷售路演、加盟招商、募資簡報。' },
    { title: '2+1 天課程，六件提案成果', body: '兩天正課，從信念到募資，第三天舞台PK日免費加贈。' },
  ],
  audience: ['準備加盟擴張的事業經營者', '想提高單價的講師與顧問', '正在準備募資的創業家', '想建立銷售現金流的企業主', '準備走向更大市場的品牌經營者', '沒有演講經驗，想要進步神速的企業家'],
  schedule: {
    sessionCode: 'win-seminar-sample',
    startAt: '2026-12-31T20:00:00+08:00',
    durationSeconds: 90 * 60,
    soonMinutes: 30,
    offerAtSeconds: 60 * 60,
    offerDeadline: '',
    nextSession: null,
  },
  video: {
    provider: 'hls', id: '', hash: '', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', sample: true,
    chapters: [
      { at: 0, title: '開場／導師介紹' },
      { at: 900, title: '專業變現的商業語言' },
      { at: 1800, title: '一個核心，三種關鍵提案' },
      { at: 2700, title: '產業成長模型拆解' },
      { at: 3300, title: '真實事業上台的三關實戰' },
      { at: 3480, title: '課程介紹' },
    ],
  },
  notes: [
    { id: 'w1', at: 300, chapter: '開場／導師介紹', text: '導師林嘉宏WIN博士，走過真實市場的教學系統。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'w2', at: 1200, chapter: '專業變現的商業語言', text: '同一事業，三種提案邏輯。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'w3', at: 2100, chapter: '一個核心，三種關鍵提案', text: '銷售路演、加盟招商、募資簡報，都從同一個核心出發。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'w4', at: 3360, chapter: '真實事業上台的三關實戰', text: '第三天舞台PK日，帶著真實事業上台。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'w5', at: 3480, chapter: '課程介紹', text: '兩天正課，從信念到募資，第三天舞台PK日免費加贈。', holdSeconds: 12, preset: true, enabled: true },
  ],
  messages: [
    { id: 'a1', at: 20, kind: 'announcement', name: 'WIN 課程團隊', body: '歡迎來到說明會。聲音沒開的話，點一下畫面就會有聲音。', pinned: true },
    { id: 'a2', at: 1800, kind: 'faq', name: 'WIN 課程團隊', body: '有問題可以在下方留言，我們會在說明會後用 Email 或 LINE 回覆你。' },
    { id: 'a3', at: 3600, kind: 'announcement', name: 'WIN 課程團隊', body: '課程報名方式已經在畫面下方。' },
  ],
  labelScripted: true,
  faqs: [
    { q: '說明會可以重看嗎？', a: '說明會不開放重播。錯過的話，可以預約下一場。' },
    { q: '課程怎麼安排？', a: '兩天正課，從信念到募資，第三天舞台PK日免費加贈。' },
    { q: '怎麼報名？', a: '說明會後段會出現課程卡，按「我要下單」填資料即可前往付款。也可以先用 LINE 問我們。' },
  ],
  questions: { enabled: true, moderated: true, placeholder: '想問 WIN 博士什麼？' },
  cta: {
    mode: 'card',
    productName: 'Expert to Enterprise',
    productLine: 'WIN講師班',
    description: '兩天正課，從信念到募資，第三天舞台PK日免費加贈。',
    priceTwd: 39800,
    originalPriceTwd: 59800,
    seatsText: '',
    buttonLabel: '我要下單',
    floatingLabel: '立即報名講師班',
    submitLabel: '前往結帳',
    terms: '送出即表示同意提供姓名、手機與 Email，供這次報名與付款使用。',
    target: 'win-lecturer-full',
    formFields: [],
    successTitle: '正在前往付款頁面',
    successBody: '付款完成後，上課資訊會用 Email 和 LINE 通知你。',
    fallback: { label: '先問真人客服', url: 'https://line.me/R/ti/p/@dmd9019a' },
  },
  contact: { lineUrl: 'https://line.me/R/ti/p/@dmd9019a', lineLabel: 'LINE 問我們', email: '' },
  tracking: { metaPixelId: '' },
  notify: defaultNotify('WIN講師班'),
};
