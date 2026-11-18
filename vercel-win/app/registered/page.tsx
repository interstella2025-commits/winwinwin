'use client';
import { useEffect, useState } from 'react';
import FlowText from '../../components/flow-text';
import { sessionByCode } from '../../lib/course-sessions';
function previewHost() {
 const h = location.hostname;
 return h !== '2027course.win-lin.com' && h !== 'win-lecturer-20261018.vercel.app';
}
export default function Registered() {
 const [view, setView] = useState<{ date: string; time: string } | null>(null);
 const [ready, setReady] = useState(false);
 useEffect(() => {
  const demo = new URLSearchParams(location.search).get('demo');
  let code = '';
  if (demo && previewHost()) code = '線上課|2026-11-24（二）|12:00–13:30';
  else {
   try {
    const raw = sessionStorage.getItem('win-online-done');
    code = raw ? String(JSON.parse(raw).code || '') : '';
   } catch { code = ''; }
  }
  const session = sessionByCode(code);
  setView(session && session.format === 'online' ? { date: session.date, time: session.time } : null);
  setReady(true);
 }, []);
 const done = ready && view;
 const missing = ready && !view;
 return <div className="enrolled"><header><a className="brand" href="/">EXPERT TO <b>ENTERPRISE</b></a></header>
  <main className="enrolled-main"><div className="enrolled-card" aria-live="polite">
   {done && view && <>
    <p className="enrolled-kicker">WIN · 線上課</p>
    <h1>報名完成</h1>
    <p className="enrolled-price"><span>線上課（直播）90 分鐘，</span><span className="enrolled-free">限時免費</span></p>
    <p className="enrolled-session"><span>{view.date}</span><span>{view.time}（台灣時間）</span></p>
    <p><FlowText parts={['上課連結將於開課前寄送至您的 Email，', '請留意信箱。']}/></p>
    <p><FlowText parts={['確認信已寄到你填寫的 Email，', '沒看到請查看垃圾郵件匣。']}/></p>
   </>}
   {missing && <>
    <h1>尚未完成報名</h1>
    <p>請回到報名頁，選擇線上場次後再送出。</p>
   </>}
   <p className="enrolled-back"><a href="/#apply">返回課程報名頁</a></p>
  </div></main></div>;
}
