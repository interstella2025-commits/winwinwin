/** Payable sessions.
 * Online slots continue the previous live cadence: every 3 days, alternating
 * 20:00–21:30 and 12:00–13:30 (11/15 20:00, 11/18 12:00, 11/21 20:00, …).
 * The first slot on or after 2026-11-22 is 2026-11-24 12:00–13:30.
 * In-person dates are fixed. No venue address is stored in this project.
 */
export const COURSE_SESSIONS = [
 {code:'線上課|2026-11-24（二）|12:00–13:30',format:'online',date:'11 月 24 日（二）',time:'12:00–13:30'},
 {code:'線上課|2026-11-27（五）|20:00–21:30',format:'online',date:'11 月 27 日（五）',time:'20:00–21:30'},
 {code:'線上課|2026-11-30（一）|12:00–13:30',format:'online',date:'11 月 30 日（一）',time:'12:00–13:30'},
 {code:'線上課|2026-12-03（四）|20:00–21:30',format:'online',date:'12 月 3 日（四）',time:'20:00–21:30'},
 {code:'實體課（台北場）12/2（三）13:00–15:00',format:'inperson',iso:'2026-12-02',date:'12/2（三）',time:'13:00–15:00'},
 {code:'實體課（台北場）12/16（三）13:00–15:00',format:'inperson',iso:'2026-12-16',date:'12/16（三）',time:'13:00–15:00'},
] as const;
/** Already-created orders may still complete. Not payable for new checkouts. */
const LEGACY_SESSION_LABELS: Record<string, string> = {
 '2026-11-15':'線上課（直播），2026 年 11 月 15 日（日）20:00–21:30（台灣時間）',
 '2026-11-18':'線上課（直播），2026 年 11 月 18 日（三）12:00–13:30（台灣時間）',
 '2026-11-21':'線上課（直播），2026 年 11 月 21 日（六）20:00–21:30（台灣時間）',
 '2026-11-24':'線上課（直播），2026 年 11 月 24 日（二）12:00–13:30（台灣時間）',
 '2026-11-27':'線上課（直播），2026 年 11 月 27 日（五）20:00–21:30（台灣時間）',
 '2026-11-30':'線上課（直播），2026 年 11 月 30 日（一）12:00–13:30（台灣時間）',
};
/** Free "notify me about other sessions" signup. Never payable. */
export const NOTIFY_CODE='notify';
export const NOTIFY_LABEL='其他場次通知';
export function sessionByCode(code:string|null|undefined){return COURSE_SESSIONS.find(v=>v.code===code)??null}
export function sessionLabel(code:string|null|undefined){
 const s=sessionByCode(code);
 if(s){if(s.format==='inperson')return s.code;return `線上課（直播），2026 年 ${s.date} ${s.time}（台灣時間）`}
 return code?LEGACY_SESSION_LABELS[code]??null:null;
}
