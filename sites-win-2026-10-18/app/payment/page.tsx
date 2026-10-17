'use client';
import { useEffect,useState } from 'react';
type Result={status:string;amount:number;orderNo:string;emailSent:boolean;isTest?:boolean;session?:string|null;error?:string};
export default function Payment(){
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[token,setToken]=useState('');
 useEffect(()=>{const value=new URLSearchParams(location.search).get('token');if(!value){setError('付款連結無效，請回到報名頁。');return}setToken(value);let cancelled=false,count=0;let timer:ReturnType<typeof setTimeout>;
 async function read(){try{const r=await fetch('/api/payuni/status?token='+encodeURIComponent(value!),{cache:'no-store'});const body=await r.json() as Result;if(!r.ok)throw new Error(body.error||'無法取得付款結果。');if(cancelled)return;setResult(body);setError('');if(body.status==='pending'&&++count<30)timer=setTimeout(read,3000)}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'無法取得付款結果。')}}
 void read();return()=>{cancelled=true;clearTimeout(timer)}},[]);
 const test=result?.isTest,paid=result?.status==='paid',pending=result?.status==='pending';
 return <main style={{maxWidth:640,margin:'80px auto',padding:24,lineHeight:1.8}}><h1>{paid?(test?'測試付款成功':'前導課付款成功'):pending?'正在確認付款結果':'WIN 前導課付款結果'}</h1><p>{test?'WIN 金流驗收測試':'WIN 講師班｜90分鐘線上前導課'} · NT${result?.amount??399}</p>{result&&<><p>訂單編號：{result.orderNo}</p>{!test&&result.session&&<p>暫定線上場次：{result.session}<br/>實際安排與上課連結以主辦方通知為準。</p>}<p>{paid?(test?'NT$1 測試付款已完成。此為金流驗收，不包含課程報名或席位。':'已收到你的 NT$399 前導課款項。線上課程的實際安排與上課連結將另行通知。'):pending?'正在確認付款結果，請稍候；若已付款，請勿重複付款。':result.status==='expired'?'這筆付款連結已逾時。若已完成付款，請稍後重新整理查詢。':'目前尚未確認付款成功。若已扣款，請勿重複付款，請保留訂單編號。'}</p>{paid&&<p>{result.emailSent?'付款確認信已交由郵件服務寄送，請留意收件匣與垃圾郵件。':'付款已完成；確認信尚在處理中，請保留此訂單編號。'}</p>}{pending&&<a href={'/api/payuni/checkout?token='+encodeURIComponent(token)}>尚未付款，繼續付款 NT${result.amount} →</a>}</>}{error&&<p role="alert">{error}</p>}<p><a href="/#apply">返回課程報名頁</a></p><p className="note">{test?'此為 NT$1 測試付款，不包含課程報名。':'此款項僅為線上前導課，不代表正式講師班錄取或費用。'}</p></main>
}
