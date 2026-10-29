export const COURSE_SESSIONS = [
 {code:'2026-11-15',date:'11 月 15 日（日）',time:'20:00–21:30'},
 {code:'2026-11-18',date:'11 月 18 日（三）',time:'12:00–13:30'},
 {code:'2026-11-21',date:'11 月 21 日（六）',time:'20:00–21:30'},
 {code:'2026-11-24',date:'11 月 24 日（二）',time:'12:00–13:30'},
 {code:'2026-11-27',date:'11 月 27 日（五）',time:'20:00–21:30'},
 {code:'2026-11-30',date:'11 月 30 日（一）',time:'12:00–13:30'},
] as const;
export function sessionLabel(code:string|null|undefined){const s=COURSE_SESSIONS.find(v=>v.code===code);return s?`2026 年 ${s.date} ${s.time}（台灣時間）`:null}
