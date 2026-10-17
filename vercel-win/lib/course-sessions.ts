export const COURSE_SESSIONS = [
 {code:'2026-11-03',date:'11 月 3 日（二）',time:'19:30–21:00'},
 {code:'2026-11-10',date:'11 月 10 日（二）',time:'19:30–21:00'},
 {code:'2026-11-17',date:'11 月 17 日（二）',time:'19:30–21:00'},
 {code:'2026-11-24',date:'11 月 24 日（二）',time:'19:30–21:00'},
] as const;
export function sessionLabel(code:string|null|undefined){const s=COURSE_SESSIONS.find(v=>v.code===code);return s?`2026 年 ${s.date} ${s.time}（暫定，台灣時間）`:null}
