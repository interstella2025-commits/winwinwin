'use client';
import { useEffect,useState } from 'react';
import './payment.css';
type Result={status:string;amount:number;orderNo:string;emailSent:boolean;isTest?:boolean;session?:string|null;error?:string};
const LINE_URL='https://line.me/R/ti/p/@dmd9019a';
const MAX_POLLS=30;
// Preview-only visual mock (?demo=paid|pending|failed|test|timeout). Never active on production hosts.
function demoResult(kind:string):Result|null{
 const h=location.hostname;if(h==='2027course.win-lin.com'||h==='win-lecturer-20261018.vercel.app')return null;
 const base={amount:399,orderNo:'WIN-DEMO-0001',emailSent:true,session:null};
 if(kind==='paid')return{...base,status:'paid'};if(kind==='pending'||kind==='timeout')return{...base,status:'pending'};
 if(kind==='failed')return{...base,status:'failed'};if(kind==='test')return{...base,amount:1,status:'paid',isTest:true};return null}
function LineButton({label}:{label:string}){return <a className="pay-line" href={LINE_URL} target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M20.5 10.5c0 4.4-4.1 8-9.2 8H9.8L5 21l.9-4.2C3.8 15.3 2.5 13 2.5 10.5c0-4.4 4-8 9-8s9 3.6 9 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg><span>{label}</span></a>}
export default function Payment(){
 const [result,setResult]=useState<Result|null>(null),[error,setError]=useState(''),[token,setToken]=useState(''),[timedOut,setTimedOut]=useState(false);
 useEffect(()=>{const q=new URLSearchParams(location.search);const demo=q.get('demo');if(demo){const d=demoResult(demo);if(d){setResult(d);setToken('demo');if(demo==='timeout')setTimedOut(true);return}}
 const value=q.get('token');if(!value){setError('付款連結無效，請回到報名頁。');return}setToken(value);let cancelled=false,count=0;let timer:ReturnType<typeof setTimeout>;
 async function read(){try{const r=await fetch('/api/payuni/status?token='+encodeURIComponent(value!),{cache:'no-store'});const body=await r.json() as Result;if(!r.ok)throw new Error(body.error||'無法取得付款結果。');if(cancelled)return;setResult(body);setError('');if(body.status==='pending'){if(++count<MAX_POLLS)timer=setTimeout(read,3000);else setTimedOut(true)}}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'無法取得付款結果。')}}
 void read();return()=>{cancelled=true;clearTimeout(timer)}},[]);
 const test=!!result?.isTest,paid=result?.status==='paid',pending=result?.status==='pending',checking=!result&&!error;
 const failed=!!result&&!paid&&!pending;
 const title=paid?(test?'測試付款成功':'付款成功，報名完成'):pending?(timedOut?'付款結果確認中':'正在確認付款結果'):checking?'正在確認付款結果':result?.status==='expired'?'付款連結已逾時':'尚未確認付款';
 return <div className="pay-page"><header><a className="brand" href="/">EXPERT TO <b>ENTERPRISE</b></a></header>
 <main className="pay-main"><div className="pay-card" aria-live="polite">
 <p className="pay-eyebrow">{test?'WIN · PAYMENT TEST':'WIN · ONLINE EXPERIENCE'}</p>
 <div className={'pay-icon '+(paid?'ok':failed||error?'bad':'wait')} aria-hidden="true">{paid?'✓':failed||error?'!':<span className="pay-spin"/>}</div>
 <h1>{title}</h1>
 <p className="pay-product">{test?'WIN 金流驗收測試':'WIN 講師班｜90分鐘線上前導課'}<br/><strong>NT${result?.amount??(test?1:399)}</strong></p>
 {result&&<dl className="pay-meta"><div><dt>訂單編號</dt><dd>{result.orderNo}</dd></div>{!test&&result.session&&<div><dt>暫定場次</dt><dd>{result.session}</dd></div>}</dl>}
 {paid&&!test&&<section className="pay-next" aria-labelledby="next-title"><h2 id="next-title">下一步</h2><ol>
 <li><span className="pay-step">1</span><div><strong>加入 LINE 官方帳號</strong><p>加入後，課程相關問題<br/>可直接在 LINE 詢問。</p><LineButton label="加入 LINE 官方帳號"/></div></li>
 <li><span className="pay-step">2</span><div><strong>查收付款確認信</strong><p>{result.emailSent?'確認信已寄到你填寫的 Email，':'確認信正在寄送中，'}<br/>沒看到請查看垃圾郵件匣。</p></div></li></ol></section>}
 {paid&&test&&<p className="pay-text">NT$1 測試付款已完成。<br/>此為金流驗收，不包含課程報名或席位。<br/>{result.emailSent?'確認信已寄出，請查收（含垃圾郵件匣）。':'確認信尚在處理中。'}</p>}
 {(pending&&!timedOut||checking)&&<p className="pay-text">請稍候，系統正在確認付款結果。<br/>若已付款，請勿重複付款。</p>}
 {pending&&timedOut&&<><p className="pay-text">付款結果還在確認中。<br/>若已完成付款，請稍後重新整理此頁，<br/>或透過 LINE 聯絡我們協助查詢。</p><LineButton label="LINE 聯絡專人協助"/></>}
 {pending&&<a className="pay-secondary" href={'/api/payuni/checkout?token='+encodeURIComponent(token)}>尚未付款？繼續付款 NT${result!.amount} →</a>}
 {failed&&<><p className="pay-text">{result!.status==='expired'?'這筆付款連結已逾時。':'目前尚未確認付款成功。'}<br/>若已扣款，請勿重複付款，<br/>請保留訂單編號並透過 LINE 聯絡我們。</p><LineButton label="LINE 聯絡專人協助"/></>}
 {error&&<><p className="pay-text" role="alert">{error}</p><LineButton label="LINE 聯絡專人協助"/></>}
 <p className="pay-back"><a href="/#apply">返回課程報名頁</a></p>
 <p className="pay-note">{test?'此為 NT$1 測試付款，不包含課程報名。':<>此款項僅為線上前導課，<br/>不代表正式講師班錄取或費用。</>}</p>
 </div></main></div>
}
