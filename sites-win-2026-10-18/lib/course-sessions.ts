// Selectable codes, dates and times match frontend precourse-sessions-1115 @ 917b8021136e513fa63f1f069643d95c78339cb0.
// 2026-11-24 is also a legacy id (19:30–21:00). New applications store ACTIVE_SESSION_CATALOG; rows without it keep the legacy label.
export const ACTIVE_SESSION_CATALOG='precourse-1115';
export const COURSE_SESSIONS = [
 {code:'2026-11-15',date:'11 月 15 日（日）',time:'20:00–21:30'},
 {code:'2026-11-18',date:'11 月 18 日（三）',time:'12:00–13:30'},
 {code:'2026-11-21',date:'11 月 21 日（六）',time:'20:00–21:30'},
 {code:'2026-11-24',date:'11 月 24 日（二）',time:'12:00–13:30'},
 {code:'2026-11-27',date:'11 月 27 日（五）',time:'20:00–21:30'},
 {code:'2026-11-30',date:'11 月 30 日（一）',time:'12:00–13:30'},
] as const;
export const LEGACY_COURSE_SESSIONS = [
 {code:'2026-11-03',date:'11 月 3 日（二）',time:'19:30–21:00'},
 {code:'2026-11-10',date:'11 月 10 日（二）',time:'19:30–21:00'},
 {code:'2026-11-17',date:'11 月 17 日（二）',time:'19:30–21:00'},
 {code:'2026-11-24',date:'11 月 24 日（二）',time:'19:30–21:00'},
] as const;
const COLLIDING_SESSION_CODE='2026-11-24';
export function isSelectableSession(code:string|null|undefined){return COURSE_SESSIONS.some(s=>s.code===code)}
function currentLabel(code:string){const s=COURSE_SESSIONS.find(v=>v.code===code);return s?`2026 年 ${s.date} ${s.time}（台灣時間）`:null}
function legacyLabel(code:string){const s=LEGACY_COURSE_SESSIONS.find(v=>v.code===code);return s?`2026 年 ${s.date} ${s.time}（暫定，台灣時間）`:null}
export function sessionLabel(code:string|null|undefined,catalog?:string|null){if(!code)return null;if(code===COLLIDING_SESSION_CODE)return catalog===ACTIVE_SESSION_CATALOG?currentLabel(code):legacyLabel(code);return currentLabel(code)??legacyLabel(code)}
export function describeStoredSession(code:string|null|undefined,catalog?:string|null){const storedCatalog=catalog||null;const label=sessionLabel(code,storedCatalog);const legacy=Boolean(code)&&LEGACY_COURSE_SESSIONS.some(s=>s.code===code)&&(code!==COLLIDING_SESSION_CODE||storedCatalog!==ACTIVE_SESSION_CATALOG);return {code:code||null,catalog:storedCatalog,label,legacy,selectable:isSelectableSession(code)}}
