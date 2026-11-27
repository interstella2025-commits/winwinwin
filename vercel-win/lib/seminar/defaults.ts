import type { NotifyTemplate, SeminarConfig } from './types';

/** 各專案共用的通知範本。只用 Email 或 LINE，不用簡訊。群發前都要擁有者核准。 */
export function defaultNotify(brand: string): NotifyTemplate[] {
  return [
    { id: 'reserved', label: '預約成功', channels: ['email'], enabled: true, offsetMinutes: null, approved: true, subject: `已收到你的說明會預約｜${brand}`, body: '{姓名}你好，\n\n說明會時間：{開始時間}\n觀看連結：{觀看連結}\n\n開始前我們會再提醒你一次。' },
    { id: 'before24h', label: '開始前 24 小時', channels: ['email', 'line'], enabled: true, offsetMinutes: -1440, approved: false, subject: `明天見｜${brand} 說明會`, body: '{姓名}你好，說明會明天 {開始時間} 開始。\n觀看連結：{觀看連結}' },
    { id: 'before1h', label: '開始前 1 小時', channels: ['email', 'line'], enabled: true, offsetMinutes: -60, approved: false, subject: `一小時後開始｜${brand} 說明會`, body: '{姓名}你好，說明會一小時後開始，記得準備耳機和筆記。\n觀看連結：{觀看連結}' },
    { id: 'started', label: '說明會開始了', channels: ['line'], enabled: true, offsetMinutes: 0, approved: false, subject: '說明會開始了', body: '說明會已經開始，現在進來還來得及。\n{觀看連結}' },
    { id: 'notes', label: '你的筆記', channels: ['email', 'line'], enabled: true, offsetMinutes: 5, approved: false, subject: `你的說明會筆記｜${brand}`, body: '{姓名}你好，這是你在說明會存下的重點：\n\n{重點清單}\n\n{自由筆記}\n\n{報名連結}' },
    { id: 'offer', label: '重點回顧與優惠', channels: ['email', 'line'], enabled: false, offsetMinutes: 120, approved: false, subject: `說明會重點回顧｜${brand}`, body: '{姓名}你好，謝謝你參加說明會。\n說明會限定方案到 {截止時間} 為止。\n{報名連結}' },
    { id: 'offerEnding', label: '優惠即將截止', channels: ['email', 'line'], enabled: false, offsetMinutes: null, approved: false, subject: `說明會限定方案即將截止｜${brand}`, body: '{姓名}你好，說明會限定方案會在 {截止時間} 結束。\n{報名連結}' },
    { id: 'noShow', label: '預約但沒來', channels: ['email', 'line'], enabled: false, offsetMinutes: 30, approved: false, subject: `下一場說明會時間｜${brand}`, body: '{姓名}你好，這次沒看到你。下一場是 {下一場}，歡迎再預約。' },
    { id: 'paid', label: '付款成功', channels: ['email', 'line'], enabled: true, offsetMinutes: null, approved: true, subject: `付款成功｜${brand}`, body: '{姓名}你好，已收到你的款項。後續上課資訊會用 Email 和 LINE 通知你。' },
  ];
}

export const NEUTRAL_THEME: SeminarConfig['theme'] = {
  bg: '#0e1420', surface: '#161e2d', ink: '#f4f1ea', muted: '#b9b4a9', accent: '#d9b46a', line: '#2a3446', onAccent: '#14110b',
};
