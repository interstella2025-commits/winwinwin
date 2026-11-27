'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { clientPhase, formatTaipei, formatTimestamp } from '@/lib/seminar/clock';
import type { PublicConfig } from '@/lib/seminar/public';
import type { CtaMode, Phase, SeminarState } from '@/lib/seminar/types';
import Countdown from './countdown';
import Player from './player';
import { CtaCard, CtaSheet, FloatingCta } from './cta';
import { Channels, Consent, Field, post, recallPerson, rememberPerson, Trap } from './forms';

type View = { demo: boolean; pin: Phase | null; cta: CtaMode | null };
type Props = { config: PublicConfig; initial: SeminarState; view: View; order: string | null; modes: Array<{ id: CtaMode; label: string }> };
type SavedNote = { id: string; at: number; text: string };
type Thread = { id: string; kind: 'mine' | 'faq-q' | 'faq-a'; body: string };
type PublicQuestion = { id: string; name: string; body: string; reply: string; position: number };

const LIVE: Phase[] = ['S2', 'S3'];
const OFFER: Phase[] = ['S3', 'S4'];
const DEMO_STEPS: Array<[Phase, string]> = [['S0', '預約'], ['S1', '即將開始'], ['S2', '進行中'], ['S3', '方案出現'], ['S4', '已結束'], ['S5', '方案截止']];

function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(init);
  useEffect(() => { try { const raw = localStorage.getItem(key); if (raw) setV(JSON.parse(raw)); } catch { /* 無痕模式 */ } }, [key]);
  const save = useCallback((next: T | ((p: T) => T)) => {
    setV(prev => { const val = typeof next === 'function' ? (next as (p: T) => T)(prev) : next; try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* 無痕模式 */ } return val; });
  }, [key]);
  return [v, save] as const;
}

export default function SeminarClient({ config, initial, view, order, modes }: Props) {
  const slug = config.slug;
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.parse(initial.serverNow));
  const offset = useRef(0);
  const [visitor, setVisitor] = useState('');
  const [tab, setTab] = useState<'chat' | 'notes' | 'offer'>('chat');
  const [sheet, setSheet] = useState(false);
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const store = `seminar:${slug}:${config.schedule.sessionCode}`;
  const [saved, setSaved] = useLocal<SavedNote[]>(`${store}:notes`, []);
  const [free, setFree] = useLocal<string>(`${store}:free`, '');
  const [reserved, setReserved] = useLocal<boolean>(`${store}:reserved`, false);
  const [thread, setThread] = useLocal<Thread[]>(`${store}:thread`, []);

  // 時鐘：用伺服器時間校正，每 0.5 秒更新一次畫面
  useEffect(() => {
    offset.current = Date.parse(initial.serverNow) - Date.now();
    const id = window.setInterval(() => setNow(Date.now() + offset.current), 500);
    return () => window.clearInterval(id);
  }, [initial.serverNow]);
  // 定期向伺服器確認狀態（後台改時間、示範輪播重新開始）
  useEffect(() => {
    if (view.pin) return;
    const qs = new URLSearchParams(); if (view.demo) qs.set('demo', '1'); if (view.cta) qs.set('cta', view.cta);
    const id = window.setInterval(async () => {
      try {
        const r = await fetch(`/api/seminar/${slug}/state?${qs}`, { cache: 'no-store' });
        if (!r.ok) return;
        const s = (await r.json()) as SeminarState;
        offset.current = Date.parse(s.serverNow) - Date.now();
        setState(s);
      } catch { /* 下次再試 */ }
    }, view.demo ? 8000 : 60000);
    return () => window.clearInterval(id);
  }, [slug, view.demo, view.cta, view.pin]);
  useEffect(() => {
    let id = localStorage.getItem('seminar:visitor');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('seminar:visitor', id); }
    setVisitor(id);
  }, []);

  const phase = clientPhase(state, now);
  const start = Date.parse(state.startAt);
  const position = Math.min(state.durationSeconds, Math.max(0, (now - start) / 1000));
  const realPosition = position / state.timeScale;
  const live = LIVE.includes(phase);
  const offerOpen = OFFER.includes(phase);
  const deadlineMs = Date.parse(state.offerDeadline) - now;
  const scale = state.timeScale;

  const track = useCallback((type: string, meta = '') => {
    if (!visitor) return;
    fetch(`/api/seminar/${slug}/event`, { method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, meta, visitor, demo: view.demo, position: Math.round(realPosition) }) }).catch(() => undefined);
  }, [visitor, slug, view.demo]);

  // 觀看數據：進場、心跳、進度、看到方案
  const sent = useRef(new Set<string>());
  const once = (key: string, fn: () => void) => { if (!sent.current.has(key)) { sent.current.add(key); fn(); } };
  useEffect(() => {
    if (!visitor) return;
    if (live) once('join', () => track('join'));
    if (offerOpen) once('offer', () => track('offer_view'));
    if (live) for (const p of [25, 50, 75, 100]) if (position / state.durationSeconds >= p / 100) once(`p${p}`, () => track('progress', String(p)));
  });
  useEffect(() => {
    if (!live || !visitor) return;
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') track('beat'); }, 30000);
    return () => window.clearInterval(id);
  }, [live, visitor, track]);

  // 每個專案自己的 Meta Pixel（示範模式不載入）
  useEffect(() => {
    const id = config.tracking.metaPixelId;
    if (!id || view.demo || !/^\d{6,20}$/.test(id)) return;
    const w = window as unknown as { fbq?: (...a: unknown[]) => void };
    if (w.fbq) return;
    const s = document.createElement('script');
    s.innerHTML = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${id}');fbq('track','PageView');`;
    document.head.appendChild(s);
  }, [config.tracking.metaPixelId, view.demo]);
  const pixel = (event: string) => { const w = window as unknown as { fbq?: (...a: unknown[]) => void }; if (!view.demo) w.fbq?.('track', event); };

  // 已審核的觀眾提問
  useEffect(() => {
    if (!config.questions.enabled || phase === 'S0') return;
    let stop = false;
    const load = async () => {
      try { const r = await fetch(`/api/seminar/${slug}/question`, { cache: 'no-store' }); if (r.ok && !stop) setQuestions((await r.json()).questions || []); } catch { /* 下次再試 */ }
    };
    load();
    const id = window.setInterval(load, 20000);
    return () => { stop = true; window.clearInterval(id); };
  }, [slug, config.questions.enabled, phase]);

  const visibleNotes = useMemo(() => config.notes.filter(n => phase === 'S4' || phase === 'S5' || (live && n.at * scale <= position)), [config.notes, phase, live, position, scale]);
  const currentNote = useMemo(() => {
    if (!live) return null;
    const hold = (n: { holdSeconds: number }) => (state.demo ? Math.max(6, n.holdSeconds * scale) : n.holdSeconds);
    return [...config.notes].reverse().find(n => position >= n.at * scale && position < n.at * scale + hold(n)) || null;
  }, [config.notes, live, position, scale, state.demo]);
  const chapter = useMemo(() => [...config.video.chapters].reverse().find(c => c.at * scale <= position) || null, [config.video.chapters, position, scale]);
  const messages = useMemo(() => {
    const shown = config.messages.filter(m => phase === 'S4' || phase === 'S5' || (live && m.at * scale <= position));
    return [...shown.filter(m => m.pinned), ...shown.filter(m => !m.pinned).reverse()];
  }, [config.messages, phase, live, position, scale]);

  const toggleSave = (n: { id: string; at: number; text: string }) => {
    setSaved(list => list.some(s => s.id === n.id) ? list.filter(s => s.id !== n.id) : [...list, { id: n.id, at: n.at, text: n.text }].sort((a, b) => a.at - b.at));
    if (!saved.some(s => s.id === n.id)) track('note_save', n.id);
  };
  const openSheet = () => { setSheet(true); track('cta_click', config.cta.mode); pixel(config.cta.mode === 'card' ? 'InitiateCheckout' : 'Lead'); };
  const onLine = () => track('line_click');
  const themeVars = { '--bg': config.theme.bg, '--surface': config.theme.surface, '--ink': config.theme.ink, '--muted': config.theme.muted, '--accent': config.theme.accent, '--line': config.theme.line, '--on-accent': config.theme.onAccent } as CSSProperties;
  const statusText = phase === 'S0' ? `${formatTaipei(state.startAt)} 開始` : phase === 'S1' ? '即將開始' : live ? '說明會進行中' : '說明會已結束';

  return (
    <div className={`sm sm-${phase.toLowerCase()}${offerOpen && !sheet ? ' has-float' : ''}`} style={themeVars}>
      {view.demo && <DemoBar slug={slug} view={view} phase={phase} modes={modes} kind={config.kind} />}
      <div className="sm-top">
        <span className="sm-mark">{config.brand.mark}</span>
        <span className={`sm-status${live ? ' is-live' : ''}`}>{statusText}</span>
      </div>

      {order && <p className="sm-banner" role="status">付款結果會以 Email 通知你。十分鐘內沒收到的話，請用 LINE 問我們。</p>}

      {phase === 'S0' ? (
        <Landing config={config} state={state} now={now} reserved={reserved} onReserved={() => { setReserved(true); pixel('Lead'); }} visitor={visitor} demo={view.demo} track={track} />
      ) : (
        <div className="sm-room">
          <div className="sm-stage-col">
            <div className="sm-stage">
              {phase === 'S1' && <Waiting config={config} ms={start - now} />}
              {live && <Player video={config.video} target={() => (Date.now() + offset.current - start) / 1000} poster={config.cover} onUnmute={() => track('unmute')} />}
              {phase === 'S4' && <Ended title={config.copy.endedTitle} body={config.copy.endedBody} cover={config.cover} />}
              {phase === 'S5' && <Ended title={config.copy.offerClosedTitle} body={config.copy.offerClosedBody} cover={config.cover} />}
            </div>
            {currentNote && (
              <div className="sm-cue" key={currentNote.id} role="status">
                <div><span>筆記重點{currentNote.chapter ? `・${currentNote.chapter}` : ''}</span><p>{currentNote.text}</p></div>
                <button type="button" className={`sm-cue-save${saved.some(s => s.id === currentNote.id) ? ' is-saved' : ''}`} onClick={() => toggleSave(currentNote)}>{saved.some(s => s.id === currentNote.id) ? '已存' : '存到筆記'}</button>
              </div>
            )}
            <div className="sm-info">
              <p className="sm-info-meta">
                {live ? <>{chapter ? chapter.title : config.copy.eyebrow}<span className="sm-sep" /><span className="sm-num">{formatTimestamp(realPosition)}</span></> : phase === 'S1' ? `${formatTaipei(state.startAt)} 開始` : '本場說明會不開放重播'}
              </p>
              <h1>{joinTitle(config.copy.titleLines)}</h1>
              <Speaker speaker={config.speaker} />
            </div>
          </div>

          <aside className="sm-panel">
            <div className="sm-tabs" role="tablist">
              <button role="tab" type="button" aria-selected={tab === 'chat'} onClick={() => setTab('chat')}>訊息</button>
              <button role="tab" type="button" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>筆記{saved.length ? <span className="sm-count">{saved.length}</span> : null}</button>
              {(offerOpen || phase === 'S5') && <button role="tab" type="button" aria-selected={tab === 'offer'} onClick={() => setTab('offer')}>方案</button>}
            </div>
            <div className="sm-tabpanel">
              {tab === 'chat' && <Chat config={config} phase={phase} messages={messages} questions={questions} thread={thread} setThread={setThread} visitor={visitor} demo={view.demo} position={realPosition} />}
              {tab === 'notes' && <Notes config={config} phase={phase} notes={visibleNotes} saved={saved} toggle={toggleSave} free={free} setFree={setFree} visitor={visitor} demo={view.demo} />}
              {tab === 'offer' && <CtaCard config={config} phase={phase} deadlineMs={deadlineMs} onOpen={openSheet} onLine={onLine} />}
            </div>
          </aside>

          {(offerOpen || phase === 'S5') && <div className="sm-offer-wide"><CtaCard config={config} phase={phase} deadlineMs={deadlineMs} onOpen={openSheet} onLine={onLine} /></div>}
          <About config={config} />
        </div>
      )}

      <Footer config={config} onLine={onLine} />
      {offerOpen && !sheet && <FloatingCta config={config} phase={phase} deadlineMs={deadlineMs} onOpen={openSheet} />}
      {sheet && <CtaSheet config={config} demo={view.demo} visitor={visitor} onClose={() => setSheet(false)} track={track} onLead={() => pixel('Lead')} onCheckout={() => pixel('InitiateCheckout')} />}
    </div>
  );
}

/** 英文行尾接下一行時補空格。 */
function joinTitle(lines: string[]) {
  return lines.reduce((acc, l) => (acc && /[A-Za-z0-9]$/.test(acc) ? `${acc} ${l}` : acc + l), '');
}

function DemoBar({ slug, view, phase, modes, kind }: { slug: string; view: View; phase: Phase; modes: Props['modes']; kind: string }) {
  const href = (p: { at?: Phase | null; cta?: CtaMode | null }) => {
    const q = new URLSearchParams({ demo: '1' });
    const at = p.at === undefined ? view.pin : p.at; const cta = p.cta === undefined ? view.cta : p.cta;
    if (at) q.set('at', at); if (cta) q.set('cta', cta);
    return `/seminar/${slug}?${q}`;
  };
  return (
    <nav className="sm-demo" aria-label="示範模式">
      <p><b>{kind === 'template' ? '範本預覽' : '場次預覽'}</b>{view.pin ? '固定在單一狀態' : '示範模式，兩分鐘跑完全部狀態'}</p>
      <div>
        <a href={href({ at: null })} aria-current={!view.pin ? 'page' : undefined}>自動輪播</a>
        {DEMO_STEPS.map(([p, label]) => <a key={p} href={href({ at: p })} aria-current={view.pin === p ? 'page' : undefined} className={!view.pin && phase === p ? 'is-now' : ''}>{label}</a>)}
      </div>
      <div>
        <span>CTA</span>
        {modes.map(m => <a key={m.id} href={href({ cta: m.id })} aria-current={view.cta === m.id ? 'page' : undefined}>{m.label}</a>)}
      </div>
    </nav>
  );
}

function Speaker({ speaker }: { speaker: PublicConfig['speaker'] }) {
  return (
    <div className="sm-speaker">
      {speaker.avatar ? <img src={speaker.avatar} alt="" width={48} height={48} /> : <span className="sm-avatar" aria-hidden="true">{speaker.name.slice(0, 1)}</span>}
      <div><b>{speaker.name}</b><span>{speaker.title}</span></div>
    </div>
  );
}

function Landing({ config, state, now, reserved, onReserved, visitor, demo, track }: { config: PublicConfig; state: SeminarState; now: number; reserved: boolean; onReserved: () => void; visitor: string; demo: boolean; track: (t: string, m?: string) => void }) {
  return (
    <>
      <div className="sm-hero" style={config.cover ? { '--cover': `url(${config.cover})` } as CSSProperties : undefined}>
        <div className="sm-hero-inner">
          <div className="sm-hero-copy">
            <p className="sm-eyebrow">{config.copy.eyebrow}</p>
            <h1>{config.copy.titleLines.map((l, i) => <span key={i}>{l}</span>)}</h1>
            <p className="sm-sub">{config.copy.subtitle}</p>
            <Speaker speaker={config.speaker} />
            <div className="sm-when">
              <p>{formatTaipei(state.startAt)}・約 {Math.round(state.durationSeconds / state.timeScale / 60)} 分鐘</p>
              <Countdown ms={Date.parse(state.startAt) - now} label="距離說明會開始" />
            </div>
          </div>
          <Reserve config={config} state={state} reserved={reserved} onReserved={onReserved} visitor={visitor} demo={demo} track={track} />
        </div>
      </div>
      <About config={config} />
    </>
  );
}

function calendarLinks(config: PublicConfig, state: SeminarState) {
  const s = new Date(state.startAt), e = new Date(Date.parse(state.startAt) + state.durationSeconds / state.timeScale * 1000);
  const f = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const title = `${config.brand.name} 說明會`;
  const url = typeof window === 'undefined' ? '' : window.location.origin + window.location.pathname;
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(url)}`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//seminar//TW', 'BEGIN:VEVENT', `UID:${config.slug}-${config.schedule.sessionCode}`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(s)}`, `DTEND:${f(e)}`, `SUMMARY:${title}`, `DESCRIPTION:${url}`, `URL:${url}`, 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return { google, ics: `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}` };
}

function Reserve({ config, state, reserved, onReserved, visitor, demo, track }: { config: PublicConfig; state: SeminarState; reserved: boolean; onReserved: () => void; visitor: string; demo: boolean; track: (t: string, m?: string) => void }) {
  const [p, setP] = useState({ name: '', email: '', phone: '' });
  const [channels, setChannels] = useState(['email']);
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [cal, setCal] = useState<{ google: string; ics: string } | null>(null);
  useEffect(() => { setP(recallPerson()); setCal(calendarLinks(config, state)); }, [config, state]);
  if (reserved) {
    return (
      <div className="sm-reserve is-done" role="status">
        <h2>預約好了</h2>
        <p>開始前一天和前一小時，我們會用你選的方式提醒你。也可以先放進行事曆。</p>
        {cal && <div className="sm-cal"><a href={cal.google} target="_blank" rel="noopener noreferrer">加到 Google 日曆</a><a href={cal.ics} download={`${config.slug}.ics`}>下載行事曆檔（iPhone／Outlook）</a></div>}
        {config.contact.lineUrl && <a className="sm-btn is-ghost" href={config.contact.lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('line_click', 'reserve')}>加入 LINE 接收提醒</a>}
      </div>
    );
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!channels.length) { setError('請至少選一種提醒方式。'); return; }
    if (!consent) { setError('請勾選同意。'); track('form_error', 'reserve'); return; }
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/lead`, { type: 'reminder', ...p, channels, consent, website: trap, visitor, demo });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); track('form_error', 'reserve'); return; }
    rememberPerson(p); onReserved();
  };
  return (
    <form className="sm-reserve" onSubmit={submit} noValidate>
      <h2>預約提醒</h2>
      <p className="sm-copy">{config.copy.hook}</p>
      <Field label="姓名"><input required autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
      <Field label="Email"><input required type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
      <Channels value={channels} onChange={setChannels} />
      <Consent checked={consent} onChange={setConsent}>同意用 Email 或 LINE 接收這場說明會的提醒。</Consent>
      <Trap value={trap} onChange={setTrap} />
      {error && <p className="sm-error" role="alert">{error}</p>}
      <button type="submit" className="sm-btn" disabled={busy}>{busy ? '送出中…' : '提醒我'}</button>
    </form>
  );
}

function Waiting({ config, ms }: { config: PublicConfig; ms: number }) {
  return (
    <div className="sm-wait" style={config.cover ? { '--cover': `url(${config.cover})` } as CSSProperties : undefined}>
      <div>
        <p>說明會即將開始</p>
        <Countdown ms={ms} compact />
        <span>先戴上耳機，準備好紙筆。</span>
      </div>
    </div>
  );
}

function Ended({ title, body, cover }: { title: string; body: string; cover: string }) {
  return (
    <div className="sm-wait is-ended" style={cover ? { '--cover': `url(${cover})` } as CSSProperties : undefined}>
      <div><p>{title}</p><span>{body}</span></div>
    </div>
  );
}

function Chat({ config, phase, messages, questions, thread, setThread, visitor, demo, position }: { config: PublicConfig; phase: Phase; messages: PublicConfig['messages']; questions: PublicQuestion[]; thread: Thread[]; setThread: (f: (t: Thread[]) => Thread[]) => void; visitor: string; demo: boolean; position: number }) {
  const [text, setText] = useState('');
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ask = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    const body = text.trim(); if (body.length < 2) return;
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/question`, { body, name: recallPerson().name, website: trap, visitor, demo, position: Math.round(position) });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); return; }
    setText('');
    setThread(t => [...t, { id: crypto.randomUUID(), kind: 'mine', body }]);
  };
  const quick = (q: { q: string; a: string }) => setThread(t => [...t, { id: crypto.randomUUID(), kind: 'faq-q', body: q.q }, { id: crypto.randomUUID(), kind: 'faq-a', body: q.a }]);
  const empty = !messages.length && !questions.length && !thread.length;
  return (
    <div className="sm-chat">
      <ol className="sm-msgs" aria-live="polite">
        {empty && <li className="sm-empty">{phase === 'S1' ? '說明會開始後，主辦單位的訊息會出現在這裡。' : '目前還沒有訊息。'}</li>}
        {thread.slice().reverse().map(m => (
          <li key={m.id} className={`sm-msg is-${m.kind}`}>
            <p className="sm-msg-name">{m.kind === 'mine' ? '你的提問' : m.kind === 'faq-q' ? '你問' : '常見問題'}</p>
            <p>{m.body}</p>
            {m.kind === 'mine' && <p className="sm-msg-note">已送出，主辦單位看過後會在這裡或用 Email 回覆。</p>}
          </li>
        ))}
        {questions.slice().reverse().map(q => (
          <li key={q.id} className="sm-msg is-question">
            <p className="sm-msg-name">觀眾提問・{q.name}</p>
            <p>{q.body}</p>
            {q.reply && <p className="sm-msg-reply"><b>回覆</b>{q.reply}</p>}
          </li>
        ))}
        {messages.map(m => (
          <li key={m.id} className={`sm-msg is-${m.kind}${m.pinned ? ' is-pinned' : ''}`}>
            <p className="sm-msg-name">{m.name}{m.pinned ? '・置頂' : ''}{config.labelScripted ? <span className="sm-msg-tag">預先準備</span> : null}</p>
            <p>{m.body}</p>
          </li>
        ))}
      </ol>
      {config.faqs.length > 0 && (
        <div className="sm-quick">
          <p>常見問題</p>
          {config.faqs.map(f => <button key={f.q} type="button" onClick={() => quick(f)}>{f.q}</button>)}
        </div>
      )}
      {config.questions.enabled && phase !== 'S5' && (
        <form className="sm-ask" onSubmit={ask}>
          <label className="sm-sr" htmlFor="sm-ask-input">提問</label>
          <input id="sm-ask-input" value={text} maxLength={500} onChange={e => setText(e.target.value)} placeholder={config.questions.placeholder} />
          <Trap value={trap} onChange={setTrap} />
          <button type="submit" disabled={busy || text.trim().length < 2}>送出</button>
          {error && <p className="sm-error" role="alert">{error}</p>}
        </form>
      )}
    </div>
  );
}

function Notes({ config, phase, notes, saved, toggle, free, setFree, visitor, demo }: { config: PublicConfig; phase: Phase; notes: PublicConfig['notes']; saved: SavedNote[]; toggle: (n: SavedNote) => void; free: string; setFree: (v: string) => void; visitor: string; demo: boolean }) {
  const [p, setP] = useState({ name: '', email: '', phone: '' });
  const [channels, setChannels] = useState(['email']);
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => { setP(recallPerson()); }, []);
  const send = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!channels.length) { setError('請至少選一種方式。'); return; }
    if (!consent) { setError('請勾選同意。'); return; }
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/lead`, { type: 'notes', ...p, channels, consent, website: trap, visitor, demo, notes: { saved, free } });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); return; }
    rememberPerson(p); setDone(true);
  };
  return (
    <div className="sm-notes">
      <h3>說明會重點</h3>
      {notes.length === 0 ? <p className="sm-empty">{phase === 'S1' ? '說明會開始後，重點會依序出現在這裡。' : '下一個重點快出現了。'}</p> : (
        <ol className="sm-note-list">
          {notes.map(n => {
            const on = saved.some(s => s.id === n.id);
            return (
              <li key={n.id}>
                <span className="sm-num">{formatTimestamp(n.at)}</span>
                <p>{n.text}</p>
                <button type="button" className={on ? 'is-saved' : ''} onClick={() => toggle({ id: n.id, at: n.at, text: n.text })} aria-pressed={on}>{on ? '已存' : '存下'}</button>
              </li>
            );
          })}
        </ol>
      )}
      <h3>我的筆記</h3>
      <textarea className="sm-free" rows={4} value={free} onChange={e => setFree(e.target.value)} placeholder="想到什麼就寫下來，只存在這台裝置。" aria-label="我的筆記" />
      <p className="sm-fine">已存 {saved.length} 則重點。筆記只存在這台裝置，寄給自己才會留下來。</p>
      {done ? <p className="sm-ok" role="status">收到了。說明會結束後，筆記會寄到你留下的地方。</p> : (
        <form className="sm-form is-compact" onSubmit={send} noValidate>
          <h3>把筆記寄給我</h3>
          <Field label="姓名"><input autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Email"><input type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
          <Channels value={channels} onChange={setChannels} />
          <Consent checked={consent} onChange={setConsent}>同意用 Email 或 LINE 收到這份筆記。</Consent>
          <Trap value={trap} onChange={setTrap} />
          {error && <p className="sm-error" role="alert">{error}</p>}
          <button type="submit" className="sm-btn is-ghost" disabled={busy}>{busy ? '送出中…' : '寄給我'}</button>
        </form>
      )}
    </div>
  );
}

function About({ config }: { config: PublicConfig }) {
  return (
    <div className="sm-about">
      {config.highlights.length > 0 && (
        <div className="sm-block">
          <h2>這場說明會會談到</h2>
          <ol className="sm-highlights">
            {config.highlights.map((h, i) => <li key={h.title}><span className="sm-num">{String(i + 1).padStart(2, '0')}</span><div><b>{h.title}</b><p>{h.body}</p></div></li>)}
          </ol>
        </div>
      )}
      {config.audience.length > 0 && (
        <div className="sm-block">
          <h2>適合誰來聽</h2>
          <ul className="sm-audience">{config.audience.map(a => <li key={a}>{a}</li>)}</ul>
        </div>
      )}
      {config.faqs.length > 0 && (
        <div className="sm-block">
          <h2>常見問題</h2>
          <div className="sm-faq">{config.faqs.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
        </div>
      )}
    </div>
  );
}

function Footer({ config, onLine }: { config: PublicConfig; onLine: () => void }) {
  return (
    <div className="sm-footer">
      <p>{config.brand.name}</p>
      <p>
        {config.contact.lineUrl && <a href={config.contact.lineUrl} target="_blank" rel="noopener noreferrer" onClick={onLine}>{config.contact.lineLabel}</a>}
        {config.contact.email && <a href={`mailto:${config.contact.email}`}>{config.contact.email}</a>}
      </p>
    </div>
  );
}
