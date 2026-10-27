'use client';
import { useEffect, useRef, useState } from 'react';
import { PREMIERE } from '@/lib/premiere/config';
import type { PremiereState } from '@/lib/premiere/state';
import { formatCountdown, formatDuration, formatTaipei, formatTwd, playbackTarget, shouldResync } from '@/lib/premiere/schedule';

const copy = PREMIERE.copy;

export default function Player({ initial }: { initial: PremiereState }) {
  const [state, setState] = useState(initial);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [muted, setMuted] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [registerStatus, setRegisterStatus] = useState('');
  const [registerBusy, setRegisterBusy] = useState(false);
  const [payStatus, setPayStatus] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const offsetRef = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    offsetRef.current = Date.parse(initial.serverNow) - Date.now();
    setMounted(true);
    const clock = window.setInterval(() => setTick(value => value + 1), 250);
    return () => window.clearInterval(clock);
  }, [initial.serverNow]);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    async function pull() {
      try {
        const response = await fetch('/api/premiere/clock', { cache: 'no-store' });
        if (!response.ok) throw new Error('clock');
        const next = await response.json() as PremiereState;
        if (stop) return;
        offsetRef.current = Date.parse(next.serverNow) - Date.now();
        stateRef.current = next;
        setState(next);
      } catch { /* keep the last server offset */ }
      const current = stateRef.current;
      const now = Date.now() + offsetRef.current;
      const nearest = Math.min(
        Math.abs(Date.parse(current.startAt) - now),
        Math.abs(Date.parse(current.offerAt) - now),
        Math.abs(Date.parse(current.endsAt) - now),
      );
      timer = window.setTimeout(pull, nearest < 15000 ? 1000 : 5000);
    }
    timer = window.setTimeout(pull, 1000);
    return () => { stop = true; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('win-premiere-attendance');
    if (saved) void attend(saved);
  }, []);

  const now = mounted ? Date.now() + offsetRef.current : Date.parse(state.serverNow);
  const start = Date.parse(state.startAt);
  const offer = Date.parse(state.offerAt);
  const end = Date.parse(state.endsAt);
  const phase = now >= end ? 'ended' : now >= start ? 'playing' : 'countdown';
  const position = phase === 'countdown' ? 0 : phase === 'ended' ? state.durationSeconds : playbackTarget((now - start) / 1000, state.durationSeconds);
  const offerOpen = now >= offer;
  const remain = formatCountdown(start - now);
  void tick;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== 'playing' || !state.hlsUrl) return;
    let destroyed = false;
    let hls: { destroy: () => void } | null = null;
    const ignore = { current: false };
    const target = () => playbackTarget((Date.now() + offsetRef.current - Date.parse(stateRef.current.startAt)) / 1000, stateRef.current.durationSeconds);
    const snap = (force = false) => {
      const next = target();
      if (!force && !shouldResync(video.currentTime, next)) return;
      ignore.current = true;
      try { video.currentTime = next; } catch { /* metadata not ready */ }
      window.setTimeout(() => { ignore.current = false; }, 400);
    };
    const onSeeking = () => { if (!ignore.current && shouldResync(video.currentTime, target())) snap(true); };
    const onRate = () => { if (video.playbackRate !== 1) video.playbackRate = 1; };
    const onPause = () => {
      if (destroyed || document.visibilityState === 'hidden') return;
      if (Date.now() + offsetRef.current >= Date.parse(stateRef.current.endsAt)) return;
      snap(true);
      void video.play().catch(() => setNeedsGesture(true));
    };
    const onPlaying = () => snap(false);
    const onReturn = () => {
      if (document.visibilityState === 'hidden') return;
      snap(true);
      void video.play().catch(() => setNeedsGesture(true));
    };
    video.muted = true;
    video.defaultMuted = true;
    video.playbackRate = 1;
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('ratechange', onRate);
    video.addEventListener('pause', onPause);
    video.addEventListener('playing', onPlaying);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', onReturn);
    const timer = window.setInterval(() => snap(false), 2000);
    const url = state.hlsUrl;
    void (async () => {
      const startAt = target();
      if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = url;
      else {
        const { default: Hls } = await import('hls.js');
        if (destroyed) return;
        if (!Hls.isSupported()) { setVideoError(true); return; }
        const player = new Hls({ startPosition: startAt, capLevelToPlayerSize: true });
        hls = player;
        player.on(Hls.Events.ERROR, (_event, data) => { if (data.fatal) setVideoError(true); });
        player.loadSource(url);
        player.attachMedia(video);
      }
      const onReady = () => snap(true);
      video.addEventListener('loadedmetadata', onReady, { once: true });
      void video.play().then(() => setNeedsGesture(false)).catch(() => setNeedsGesture(true));
    })();
    return () => {
      destroyed = true;
      window.clearInterval(timer);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('ratechange', onRate);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('playing', onPlaying);
      document.removeEventListener('visibilitychange', onReturn);
      window.removeEventListener('online', onReturn);
      hls?.destroy();
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [phase, state.hlsUrl]);

  function engage() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.volume = 1;
    const next = playbackTarget((Date.now() + offsetRef.current - start) / 1000, state.durationSeconds);
    try { video.currentTime = next; } catch { /* not ready */ }
    void video.play().then(() => { setMuted(false); setNeedsGesture(false); }).catch(() => setNeedsGesture(true));
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterBusy(true);
    setRegisterStatus('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch('/api/premiere/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, sessionCode: PREMIERE.sessionCode }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; token?: string };
      if (response.status === 404) { setRegisterStatus(copy.registerUnavailable); return; }
      if (!response.ok || !body.token) throw new Error(body.error || copy.registerError);
      sessionStorage.setItem('win-premiere-attendance', body.token);
      void attend(body.token);
      setRegisterStatus(copy.registerDone);
      form.reset();
    } catch (error) {
      setRegisterStatus(error instanceof Error ? error.message : copy.registerError);
    } finally { setRegisterBusy(false); }
  }

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.checkoutEnabled) return;
    setPayBusy(true);
    setPayStatus('');
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    try {
      let requestId = sessionStorage.getItem('win-premiere-checkout-id');
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem('win-premiere-checkout-id', requestId); }
      const response = await fetch('/api/payuni/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name, email: values.email, phone: values.phone, lineName: values.lineName || '',
          profession: '', stage: '', topic: '', sessionCode: PREMIERE.sessionCode,
          consent: values.consent === 'on', website: values.website || '',
          product: state.productCode, requestId,
        }),
      });
      const body = await response.json() as { error?: string; checkoutUrl?: string; resetRequest?: boolean };
      if (body.resetRequest) sessionStorage.removeItem('win-premiere-checkout-id');
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error || '目前無法前往付款。');
      setPayStatus('即將前往付款…');
      location.assign(body.checkoutUrl);
    } catch (error) {
      setPayStatus(error instanceof Error ? error.message : '暫時無法建立付款，請稍後再試。');
      setPayBusy(false);
    }
  }

  const percent = state.durationSeconds ? Math.min(100, (position / state.durationSeconds) * 100) : 0;
  return <main className="premiere">
    <div className="premiere-bar"><a className="premiere-brand" href="/">EXPERT TO ENTERPRISE</a><a className="premiere-back" href="/">{copy.backHome}</a></div>
    <p className="premiere-kicker">{copy.eyebrow}</p>
    <h1>{copy.title}</h1>
    <p className="premiere-lead">{copy.lead}</p>
    <ul className="premiere-schedule">
      <li><span>開始</span><b>{formatTaipei(state.startAt)}</b></li>
      <li><span>長度</span><b>{formatDuration(state.durationSeconds)}</b></li>
      <li><span>報名按鈕出現</span><b>{formatTaipei(state.offerAt)}</b></li>
    </ul>
    <p className="sr-only" aria-live="polite">{phase === 'countdown' ? copy.countdown : phase === 'playing' ? copy.playing : copy.endedTitle}</p>
    <section className="premiere-stage" aria-label={copy.eyebrow}>
      {phase === 'countdown' && <div className="premiere-countdown"><p>{copy.countdown}</p><p className="premiere-count" aria-hidden="true">{remain}</p></div>}
      {phase === 'ended' && <div className="premiere-ended"><h2>{copy.endedTitle}</h2><p>{copy.endedBody}</p></div>}
      {phase === 'playing' && !state.hlsUrl && <div className="premiere-missing"><p>{copy.videoMissing}</p></div>}
      {phase === 'playing' && state.hlsUrl && <>
        <video ref={videoRef} playsInline muted autoPlay preload="auto" disablePictureInPicture />
        <div className="premiere-progress" role="progressbar" aria-label={copy.progressLabel} aria-valuemin={0} aria-valuemax={state.durationSeconds} aria-valuenow={Math.floor(position)} aria-valuetext={copy.playing}><span style={{ width: `${percent}%` }} /></div>
        {(muted || needsGesture) && <button type="button" className="premiere-engage" onClick={engage}>{needsGesture ? copy.startPlayback : copy.unmute}</button>}
        {videoError && <div className="premiere-missing"><p>{copy.videoError}</p></div>}
      </>}
    </section>
    <section className="premiere-card" aria-labelledby="premiere-register-title">
      <h2 id="premiere-register-title">{copy.registerTitle}</h2>
      <p className="premiere-copy">{copy.registerLead}</p>
      <form onSubmit={register}>
        <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>姓名 <span className="required">＊</span><input name="name" autoComplete="name" required maxLength={100} placeholder="請輸入姓名" /></label>
        <label>Email <span className="required">＊</span><input type="email" name="email" autoComplete="email" required maxLength={200} placeholder="name@example.com" /></label>
        <button className="premiere-submit" disabled={registerBusy}>{registerBusy ? '正在送出…' : copy.registerButton}</button>
        <p role="status" aria-live="polite" className="premiere-status">{registerStatus}</p>
      </form>
    </section>
    {offerOpen && <section className="premiere-card" aria-labelledby="premiere-purchase-title">
      <h2 id="premiere-purchase-title">{copy.purchaseTitle}</h2>
      <p className="premiere-copy">{copy.purchaseLead}</p>
      <p className="premiere-price">{formatTwd(state.priceTwd)}</p>
      <p className="premiere-terms">{copy.terms}</p>
      {state.checkoutEnabled ? <form onSubmit={pay}>
        <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label>姓名 <span className="required">＊</span><input name="name" autoComplete="name" required maxLength={100} /></label>
        <label>手機 <span className="required">＊</span><input name="phone" type="tel" autoComplete="tel" required maxLength={100} placeholder="例：0912 345 678" /></label>
        <label>Email <span className="required">＊</span><input type="email" name="email" autoComplete="email" required maxLength={200} /></label>
        <label>LINE 顯示名稱（選填）<input name="lineName" autoComplete="off" maxLength={100} /></label>
        <label className="consent"><input type="checkbox" name="consent" required /><span>{copy.consent}</span></label>
        <p className="premiere-warning">下一頁顯示的金額必須是 {formatTwd(state.priceTwd)}。若看到 NT$399，請不要付款。</p>
        <button className="premiere-submit gold" disabled={payBusy}>{payBusy ? '正在送出…' : `${copy.purchaseButton} ${formatTwd(state.priceTwd)}`}</button>
        <p role="status" aria-live="polite" className="premiere-status">{payStatus}</p>
      </form> : <p className="premiere-closed">{copy.checkoutClosed}</p>}
    </section>}
  </main>;
}

function attend(token: string) {
  return fetch('/api/premiere/attend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => undefined);
}
