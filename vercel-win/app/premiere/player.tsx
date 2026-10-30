'use client';
import { useEffect, useRef, useState } from 'react';
import { PREMIERE } from '@/lib/premiere/config';
import { formatTimestamp, kindLabel, normalizeMessages, visibleMessages, type PremiereMessage } from '@/lib/premiere/messages';
import type { PremiereState } from '@/lib/premiere/state';
import { formatCountdown, formatTwd, playbackTarget, shouldResync } from '@/lib/premiere/schedule';

const copy = PREMIERE.copy;

export default function Player({ initial }: { initial: PremiereState }) {
  const [state, setState] = useState(initial);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [muted, setMuted] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [script, setScript] = useState<PremiereMessage[]>([]);
  const [tab, setTab] = useState<'chat' | 'product'>('chat');
  const [sheet, setSheet] = useState(false);
  const [payStatus, setPayStatus] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const stateRef = useRef(state);
  const offered = useRef(false);
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
    let stop = false;
    async function pull() {
      try {
        const response = await fetch('/api/premiere/messages', { cache: 'no-store' });
        if (!response.ok) return;
        const body = await response.json() as { messages?: unknown };
        if (!stop) setScript(normalizeMessages(body.messages));
      } catch { /* an empty script still lets the film play */ }
    }
    void pull();
    const timer = window.setInterval(pull, 20000);
    return () => { stop = true; window.clearInterval(timer); };
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
    if (!offerOpen || phase === 'ended' || offered.current) return;
    offered.current = true;
    setTab('product');
  }, [offerOpen, phase]);

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

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.checkoutEnabled || phase === 'ended') return;
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
          name: values.name, email: values.email, phone: values.phone, lineName: '',
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
  const shown = visibleMessages(script, phase === 'countdown' ? -1 : position);
  const parts = clockParts(start - now);

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [shown.length, tab]);
  return <main className={`stage stage--${phase}`} data-phase={phase} data-tab={tab}>
    <header className="stage-bar">
      <a className="stage-brand" href="/">EXPERT <em>TO</em> ENTERPRISE</a>
      <a className="stage-back" href="/">{copy.backHome}</a>
    </header>
    <div className="stage-grid">
      <section className="stage-player" aria-label={copy.eyebrow}>
        <div className="frame">
          {phase === 'playing' && state.hlsUrl ? <>
            <video ref={videoRef} playsInline muted autoPlay preload="auto" disablePictureInPicture />
            <div className="frame-progress" role="progressbar" aria-label={copy.progressLabel} aria-valuemin={0} aria-valuemax={state.durationSeconds} aria-valuenow={Math.floor(position)} aria-valuetext={copy.playing}><span style={{ width: `${percent}%` }} /></div>
            {(muted || needsGesture) && <button type="button" className="frame-engage" onClick={engage}>{needsGesture ? copy.startPlayback : copy.unmute}</button>}
            {videoError && <p className="frame-note">{copy.videoError}</p>}
          </> : <>
            <img className="frame-still" src="/images/revision/stage-singapore.webp" alt="" />
            {phase === 'countdown' && <div className="frame-countdown">
              <p>{copy.countdown}</p>
              <div className="frame-clock" aria-hidden="true">{parts.map(([label, value]) => <span key={label}><b>{value}</b>{label}</span>)}</div>
              <p className="sr-only">{copy.countdown} {remain}</p>
            </div>}
            {phase === 'ended' && <div className="frame-ended"><h2>{splitTitle(copy.endedTitle)}</h2><p>{copy.endedBody}</p></div>}
            {phase === 'playing' && <>
              <p className="frame-live"><span />{copy.playing}</p>
              <div className="frame-progress" role="progressbar" aria-label={copy.progressLabel} aria-valuemin={0} aria-valuemax={state.durationSeconds} aria-valuenow={Math.floor(position)} aria-valuetext={copy.playing}><span style={{ width: `${percent}%` }} /></div>
              <p className="frame-note">{copy.videoMissing}</p>
            </>}
          </>}
        </div>
        <div className="host">
          <img src="/images/revision/japan.webp" alt="" />
          <div>
            <p className="host-kicker">{copy.eyebrow}</p>
            <h1>{splitTitle(copy.title)}</h1>
            <p className="host-name">{PREMIERE.hostName}</p>
            <p className="host-when">{hostWhen(state.startAt)}</p>
            <p className="host-note">{PREMIERE.hostNote}</p>
          </div>
        </div>
      </section>
      <section className="stage-panel" aria-label="說明會內容">
        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>{copy.chatTab}</button>
          <button type="button" role="tab" aria-selected={tab === 'product'} onClick={() => setTab('product')}>
            {copy.productTab}
            {offerOpen && phase !== 'ended' && <i className="offer-badge">{copy.offerBadge}</i>}
          </button>
        </div>
        {tab === 'chat' ? <div className="feed" role="tabpanel" ref={feedRef}>
          {shown.length === 0 ? <p className="feed-empty">{phase === 'countdown' ? copy.chatWaiting : copy.chatEmpty}</p> : <ol>
            {shown.map(message => <li key={message.id} className={`msg msg--${message.kind}`}>
              <span className="avatar" aria-hidden="true">{message.avatarUrl ? <img src={message.avatarUrl} alt="" /> : message.displayName.slice(0, 1)}</span>
              <span>
                <strong>{message.displayName}</strong>
                <em>{kindLabel(message.kind)}</em>
                <p>{message.body}</p>
              </span>
              <time dateTime={formatTimestamp(message.appearSeconds)}>{formatTimestamp(message.appearSeconds)}</time>
            </li>)}
          </ol>}
        </div> : <div className="product" role="tabpanel">
          {!offerOpen || phase === 'countdown' ? <p className="product-locked">{copy.offerLocked}</p> : <>
            <article className="product-card">
              <img src={PREMIERE.productImage} alt="" />
              <div>
                {offerOpen && phase !== 'ended' && <p className="offer-badge">{copy.offerBadge}</p>}
                <h2>{copy.purchaseTitle}</h2>
                <p className="product-was">{PREMIERE.originalPriceLabel}</p>
                <p className="product-now">{formatTwd(state.priceTwd)}</p>
                <p className="product-lead">{copy.purchaseLead}</p>
                <p className="product-terms">{copy.terms}</p>
                {phase === 'ended' ? <p className="product-locked">{copy.checkoutEnded}</p> : state.checkoutEnabled ? <button type="button" className="order-button" onClick={() => setSheet(true)}>{copy.orderButton}</button> : <p className="product-locked">{copy.checkoutClosed}</p>}
              </div>
            </article>
          </>}
        </div>}
      </section>
    </div>
    {sheet && <div className="sheet-back" onClick={() => setSheet(false)}>
      <form className="sheet" data-sheet="open" onClick={event => event.stopPropagation()} onSubmit={pay}>
        <p className="host-kicker">02</p>
        <h2>{copy.purchaseTitle}</h2>
        <p className="product-now">{formatTwd(state.priceTwd)}</p>
        <input className="trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <label className="field"><span className="field-name">姓名<span className="required" aria-hidden="true">＊</span></span><input name="name" autoComplete="name" required maxLength={100} /></label>
        <label className="field"><span className="field-name">手機<span className="required" aria-hidden="true">＊</span></span><input name="phone" type="tel" autoComplete="tel" required maxLength={100} placeholder="例：0912 345 678" /></label>
        <label className="field"><span className="field-name">Email<span className="required" aria-hidden="true">＊</span></span><input type="email" name="email" autoComplete="email" required maxLength={200} /></label>
        <label className="consent"><input type="checkbox" name="consent" required /><span>{copy.consent}</span></label>
        <p className="sheet-warning">下一頁顯示的金額必須是 {formatTwd(state.priceTwd)}。若看到 NT$399，請不要付款。</p>
        <button className="order-button" disabled={payBusy}>{payBusy ? '正在送出…' : copy.checkoutSubmit}</button>
        <p role="status" className="sheet-status">{payStatus}</p>
        <button type="button" className="sheet-close" onClick={() => setSheet(false)}>關閉</button>
      </form>
    </div>}
  </main>;
}

function splitTitle(title: string) {
  const cut = title.indexOf('】');
  if (cut < 0 || cut >= title.length - 1) return title;
  return <>{title.slice(0, cut + 1)}<br />{title.slice(cut + 1)}</>;
}

function hostWhen(iso: string) {
  const parts = new Intl.DateTimeFormat('zh-Hant-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const read = (type: string) => parts.find(part => part.type === type)?.value || '';
  return `${read('month')}/${read('day')}（${read('weekday').replace('週', '')}）${read('hour')}:${read('minute')}`;
}

function clockParts(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [
    ['天', String(days).padStart(2, '0')],
    ['時', String(hours).padStart(2, '0')],
    ['分', String(minutes).padStart(2, '0')],
    ['秒', String(seconds).padStart(2, '0')],
  ] as const;
}
