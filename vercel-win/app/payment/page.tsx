'use client';
import { useEffect, useState } from 'react';
import { isFullCourse, paymentNote, paymentPaidBody, paymentPaidTitle, paymentProductLine } from '@/lib/premiere/payment-copy';

type Result = { status: string; amount: number; orderNo: string; emailSent: boolean; isTest?: boolean; session?: string | null; error?: string };

export default function Payment() {
  const [result, setResult] = useState<Result | null>(null), [error, setError] = useState(''), [token, setToken] = useState('');
  useEffect(() => {
    const value = new URLSearchParams(location.search).get('token');
    if (!value) { setError('付款連結無效，請回到報名頁。'); return; }
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
        setError('');
        if (body.status === 'pending' && ++count < 30) timer = setTimeout(read, 3000);
      } catch (reason) { if (!cancelled) setError(reason instanceof Error ? reason.message : '無法取得付款結果。'); }
    }
    void read();
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);
  const test = result?.isTest, paid = result?.status === 'paid', pending = result?.status === 'pending', full = isFullCourse(result);
  const title = paid && result ? paymentPaidTitle(result) : pending ? '正在確認付款結果' : 'WIN 前導課付款結果';
  return <main style={{ maxWidth: 640, margin: '80px auto', padding: 24, lineHeight: 1.8 }}>
    <h1>{title}</h1>
    <p>{paymentProductLine(result)} · NT${result?.amount ?? 399}</p>
    {result && <>
      <p>訂單編號：{result.orderNo}</p>
      {!test && !full && result.session && <p>暫定線上場次：{result.session}<br />實際安排與上課連結以主辦方通知為準。</p>}
      <p>{paid ? paymentPaidBody(result) : pending ? '正在確認付款結果，請稍候；若已付款，請勿重複付款。' : result.status === 'expired' ? '這筆付款連結已逾時。若已完成付款，請稍後重新整理查詢。' : '目前尚未確認付款成功。若已扣款，請勿重複付款，請保留訂單編號。'}</p>
      {paid && <p>{result.emailSent ? '付款確認信已交由郵件服務寄送，請留意收件匣與垃圾郵件。' : '付款已完成；確認信尚在處理中，請保留此訂單編號。'}</p>}
      {pending && <a href={'/api/payuni/checkout?token=' + encodeURIComponent(token)}>尚未付款，繼續付款 NT${result.amount} →</a>}
    </>}
    {error && <p role="alert">{error}</p>}
    <p><a href="/#apply">返回課程報名頁</a></p>
    <p className="note">{paymentNote(result)}</p>
  </main>;
}
