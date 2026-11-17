/** Payable sessions.
 * Online live slots follow the enrollment dates and times set for this window.
 * In-person dates are fixed. No venue address is stored in this project.
 */
export const COURSE_SESSIONS = [
 {code:'線上課|2026-11-30（一）|12:00–13:30',format:'online',date:'11 月 30 日（一）',time:'12:00–13:30'},
 {code:'線上課|2026-12-06（日）|20:00–21:30',format:'online',date:'12 月 6 日（日）',time:'20:00–21:30'},
 {code:'線上課|2026-12-10（四）|12:00–13:30',format:'online',date:'12 月 10 日（四）',time:'12:00–13:30'},
 {code:'線上課|2026-12-20（日）|20:00–21:30',format:'online',date:'12 月 20 日（日）',time:'20:00–21:30'},
 {code:'線上課|2026-12-24（四）|12:00–13:30',format:'online',date:'12 月 24 日（四）',time:'12:00–13:30'},
 {code:'線上課|2026-12-27（日）|20:00–21:30',format:'online',date:'12 月 27 日（日）',time:'20:00–21:30'},
 {code:'實體課（台北場），2026 年 12 月 2 日（三）13:00–14:30（台灣時間）',format:'inperson',iso:'2026-12-02',date:'12 月 2 日（三）',time:'13:00–14:30'},
 {code:'實體課（台北場），2026 年 12 月 16 日（三）13:00–14:30（台灣時間）',format:'inperson',iso:'2026-12-16',date:'12 月 16 日（三）',time:'13:00–14:30'},
] as const;
/** Already-created orders may still display. Not payable for new checkouts. */
const LEGACY_SESSION_LABELS: Record<string, string> = {
 '2026-11-15':'線上課（直播），2026 年 11 月 15 日（日）20:00–21:30（台灣時間）',
 '2026-11-18':'線上課（直播），2026 年 11 月 18 日（三）12:00–13:30（台灣時間）',
 '2026-11-21':'線上課（直播），2026 年 11 月 21 日（六）20:00–21:30（台灣時間）',
 '2026-11-24':'線上課（直播），2026 年 11 月 24 日（二）12:00–13:30（台灣時間）',
 '2026-11-27':'線上課（直播），2026 年 11 月 27 日（五）20:00–21:30（台灣時間）',
 '2026-11-30':'線上課（直播），2026 年 11 月 30 日（一）12:00–13:30（台灣時間）',
 '線上課|2026-11-24（二）|12:00–13:30':'線上課（直播），2026 年 11 月 24 日（二）12:00–13:30（台灣時間）',
 '線上課|2026-11-27（五）|20:00–21:30':'線上課（直播），2026 年 11 月 27 日（五）20:00–21:30（台灣時間）',
 '線上課|2026-12-03（四）|20:00–21:30':'線上課（直播），2026 年 12 月 3 日（四）20:00–21:30（台灣時間）',
 '線上課|2026-12-06（日）|12:00–13:30':'線上課（直播），2026 年 12 月 6 日（日）12:00–13:30（台灣時間）',
 '線上課|2026-12-09（三）|20:00–21:30':'線上課（直播），2026 年 12 月 9 日（三）20:00–21:30（台灣時間）',
 '實體課（台北場）12/2（三）13:00–15:00':'實體課（台北場），2026 年 12 月 2 日（三）13:00–15:00（台灣時間）',
 '實體課（台北場）12/16（三）13:00–15:00':'實體課（台北場），2026 年 12 月 16 日（三）13:00–15:00（台灣時間）',
 '實體課|2026-12-02（三）|13:00–15:00':'實體課（台北場），2026 年 12 月 2 日（三）13:00–15:00（台灣時間）',
 '實體課|2026-12-16（三）|13:00–15:00':'實體課（台北場），2026 年 12 月 16 日（三）13:00–15:00（台灣時間）',
};
/** Free "notify me about other sessions" signup. Never payable. */
export const NOTIFY_CODE='notify';
export const NOTIFY_LABEL='其他場次通知';
export function sessionByCode(code:string|null|undefined){return COURSE_SESSIONS.find(v=>v.code===code)??null}
export function isInPersonCode(code:string|null|undefined){const s=sessionByCode(code);if(s)return s.format==='inperson';return !!code&&code.startsWith('實體')}
export function sessionLabel(code:string|null|undefined){
 const s=sessionByCode(code);
 if(s){const kind=s.format==='inperson'?'實體課（台北場）':'線上課（直播）';return `${kind}，2026 年 ${s.date}${s.time}（台灣時間）`}
 return code?LEGACY_SESSION_LABELS[code]??null:null;
}
