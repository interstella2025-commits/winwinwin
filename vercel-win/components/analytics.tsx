'use client';
import Script from 'next/script';
// Env-driven tracking. Renders nothing and every call is a no-op when the IDs are empty.
const PIXEL=process.env.NEXT_PUBLIC_META_PIXEL_ID||'';
const GA=process.env.NEXT_PUBLIC_GA_ID||'';
type W=Window&{fbq?:(...a:unknown[])=>void;gtag?:(...a:unknown[])=>void};
export function track(meta:'Lead'|'InitiateCheckout'|'Purchase',ga:string,params:Record<string,unknown>={},eventId?:string){
 if(typeof window==='undefined')return;const w=window as W;
 try{if(PIXEL&&w.fbq)w.fbq('track',meta,params,eventId?{eventID:eventId}:undefined)}catch{}
 try{if(GA&&w.gtag)w.gtag('event',ga,params)}catch{}
}
export default function Analytics(){
 return <>
 {PIXEL&&<Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(PIXEL)});fbq('track','PageView');`}</Script>}
 {GA&&<><Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA)}`} strategy="afterInteractive"/><Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(GA)});`}</Script></>}
 </>;
}
