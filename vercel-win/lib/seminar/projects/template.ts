import type { SeminarConfig } from '../types';
import { NEUTRAL_THEME, defaultNotify } from '../defaults';

/**
 * 制式範本。所有文字都是中性的示範文案，複製一份改成自己專案的內容即可。
 * 影片是公開測試影片（sample: true），之後換成專案自己的影片。
 */
export const templateSeminar: SeminarConfig = {
  slug: 'template',
  kind: 'template',
  brand: { name: '說明會範本', mark: 'SEMINAR' },
  theme: NEUTRAL_THEME,
  copy: {
    eyebrow: '線上說明會',
    titleLines: ['一小時，', '看懂這門課能帶你走到哪裡。'],
    subtitle: '課程內容、適合對象與報名方式，一次說清楚。',
    hook: '先把時間留下來。開始前，我們會用 Email 或 LINE 提醒你。',
    endedTitle: '說明會已結束，謝謝你看到最後。',
    endedBody: '你存下的筆記，會寄到你留下的 Email 或 LINE。',
    offerClosedTitle: '這場說明會的限定方案已結束。',
    offerClosedBody: '想了解下一梯，歡迎用 LINE 問我們。',
  },
  speaker: { name: '講者姓名', title: '講者的一句介紹，寫經歷或專長', avatar: '' },
  cover: '',
  highlights: [
    { title: '這門課在解決什麼問題', body: '用三分鐘說明課程想幫誰、解決哪一件事。' },
    { title: '上完之後會多什麼', body: '列出學員帶走的具體成果。' },
    { title: '課程怎麼進行', body: '上課形式、時數與期間。' },
  ],
  audience: ['想把專業變成收入的人', '正在找下一步方向的人', '想要有系統學習的人'],
  schedule: {
    sessionCode: 'template-session',
    startAt: '2026-12-31T20:00:00+08:00',
    durationSeconds: 60 * 60,
    soonMinutes: 30,
    offerAtSeconds: 45 * 60,
    offerDeadline: '',
    nextSession: null,
  },
  video: {
    provider: 'hls',
    id: '',
    hash: '',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    sample: true,
    chapters: [
      { at: 0, title: '開場' },
      { at: 600, title: '課程想解決的問題' },
      { at: 1500, title: '課程內容' },
      { at: 2400, title: '適合誰' },
      { at: 2700, title: '報名方式' },
    ],
  },
  notes: [
    { id: 'n1', at: 120, chapter: '開場', text: '先想清楚，你想用這門課解決哪一件事。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'n2', at: 900, chapter: '課程想解決的問題', text: '問題講得越具體，越容易找到對的方法。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'n3', at: 1800, chapter: '課程內容', text: '每一堂課都對應一個可以帶走的成果。', holdSeconds: 12, preset: true, enabled: true },
    { id: 'n4', at: 2580, chapter: '報名方式', text: '報名前，先確認上課時間和形式適合你。', holdSeconds: 12, preset: true, enabled: true },
  ],
  messages: [
    { id: 'm1', at: 30, kind: 'announcement', name: '主辦單位', body: '歡迎來到說明會。聲音沒開的話，點一下畫面就會有聲音。', pinned: true },
    { id: 'm2', at: 1200, kind: 'faq', name: '主辦單位', body: '有問題可以在下方留言，我們會在說明會後用 Email 或 LINE 回覆你。' },
    { id: 'm3', at: 2700, kind: 'announcement', name: '主辦單位', body: '報名方式已經在畫面下方，可以點開看看。' },
  ],
  labelScripted: true,
  faqs: [
    { q: '說明會可以重看嗎？', a: '說明會不開放重播。錯過的話，可以預約下一場。' },
    { q: '要準備什麼？', a: '耳機和一個可以寫字的地方就好。' },
    { q: '怎麼報名？', a: '說明會後段會出現報名方式，照著畫面操作即可。' },
  ],
  questions: { enabled: true, moderated: true, placeholder: '想問講者什麼？' },
  cta: {
    mode: 'lead',
    productName: '課程名稱',
    productLine: '一句話說明課程',
    description: '用兩三句話說明課程內容和上課方式。',
    priceTwd: 9800,
    originalPriceTwd: 0,
    seatsText: '',
    buttonLabel: '我要了解課程',
    floatingLabel: '留下聯絡方式',
    submitLabel: '送出',
    terms: '送出即表示同意我們用 Email 或 LINE 與你聯繫。',
    target: '',
    formFields: [
      { id: 'goal', label: '你最想解決的問題', type: 'textarea', required: false },
    ],
    successTitle: '收到了，謝謝你。',
    successBody: '我們會用 Email 或 LINE 與你聯繫。',
    fallback: null,
  },
  contact: { lineUrl: '', lineLabel: 'LINE 問我們', email: '' },
  tracking: { metaPixelId: '' },
  notify: defaultNotify('說明會範本'),
};
