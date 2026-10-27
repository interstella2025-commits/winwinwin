'use client';
import { useEffect, useState } from 'react';
import { paymentView, type PaymentResult } from '@/lib/premiere/payment-copy';

type Result = PaymentResult & { status: string; amount: number; orderNo: string; emailSent: boolean; error?: string };

export default function Payment() {
  const [result, setResult] = useState<Result | null>(null), [error, setError] = useState(''), [failed, setFailed] = useState(false), [token, setToken] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(location.search).get('token');
    if (!value) { setFailed(true); setError('付款連結無效，請回到報名頁。'); return; }
    setToken(value);
    let cancelled = false, count = 0;
    let timer: ReturnType<typeof setTimeout>;
    async function read() {
      try {
        const response = await fetch('/api/payuni/status?token=' + encodeURIComponent(value!), { cache: 'no-store' });
        const body = await response.json() as Result;
        if (!response.ok) throw new Error(body.error || '無法取得付款結果。');
        if (cancelled) return;
        setResult(body);
        setFailed(false);
        setError('');
        if (body.status === 'pending' && ++count < 30) timer = setTimeout(read, 3000);
      } catch (reason) {
        if (!cancelled) { setFailed(true); setError(reason instanceof Error ? reason.message : '無法取得付款結果。'); }
      }
    }
    void read();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  const view = paymentView(result, failed);
  const paid = result?.status === 'paid', pending = result?.status === 'pending';
  return <main style={{ maxWidth: 640, margin: '80px auto', padding: 24, lineHeight: 1.8 }}>
    <h1>{view.title}</h1>
    {view.productLine && <p>{view.productLine}</p>}
    {result && <>
      <p>訂單編號：{result.orderNo}</p>
      {view.showSession && result.session && <p>暫定線上場次：{result.session}<br />實際安排與上課連結以主辦方通知為準。</p>}
      {view.body && <p>{view.body}</p>}
      {paid && <p>{result.emailSent ? '付款確認信已交由郵件服務寄送，請留意收件匣與垃圾郵件。' : '付款已完成；確認信尚在處理中，請保留此訂單編號。'}</p>}
      {pending && <a href={'/api/payuni/checkout?token=' + encodeURIComponent(token)}>尚未付款，繼續付款 NT${result.amount} →</a>}
    </>}
    {error && <p role="alert">{error}</p>}
    <p><a href="/#apply">返回課程報名頁</a></p>
    {view.note && <p className="note">{view.note}</p>}
  </main>;
}
