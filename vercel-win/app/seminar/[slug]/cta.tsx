'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { formatTwd } from '@/lib/seminar/clock';
import type { PublicConfig } from '@/lib/seminar/public';
import type { Phase } from '@/lib/seminar/types';
import Countdown from './countdown';
import { Channels, Consent, Field, post, recallPerson, rememberPerson, Trap } from './forms';

type Track = (type: string, meta?: string) => void;

export function Price({ cta }: { cta: PublicConfig['cta'] }) {
  if (cta.mode !== 'card' || !cta.priceTwd) return null;
  return (
    <p className="sm-price">
      <span className="sm-price-label">說明會限定</span>
      <b className="sm-num">{formatTwd(cta.priceTwd)}</b>
      {cta.originalPriceTwd > cta.priceTwd && <s className="sm-num">{formatTwd(cta.originalPriceTwd)}</s>}
    </p>
  );
}

/** 方案卡：出現在「方案」分頁、結束畫面與桌機側欄。 */
export function CtaCard({ config, phase, deadlineMs, onOpen, onLine }: { config: PublicConfig; phase: Phase; deadlineMs: number; onOpen: () => void; onLine: () => void }) {
  const { cta, contact } = config;
  if (phase === 'S5') {
    return (
      <div className="sm-offer is-closed">
        <h3>{config.copy.offerClosedTitle}</h3>
        <p>{config.copy.offerClosedBody}</p>
        {config.schedule.nextSession && <a className="sm-btn" href={config.schedule.nextSession.url}>預約下一場：{config.schedule.nextSession.label}</a>}
        {contact.lineUrl && <a className="sm-btn is-ghost" href={contact.lineUrl} target="_blank" rel="noopener noreferrer" onClick={onLine}>{contact.lineLabel}</a>}
      </div>
    );
  }
  return (
    <div className="sm-offer">
      {cta.productLine && <p className="sm-offer-line">{cta.productLine}</p>}
      <h3>{cta.productName}</h3>
      {cta.description && <p className="sm-offer-desc">{cta.description}</p>}
      <Price cta={cta} />
      {cta.seatsText && <p className="sm-offer-seats">{cta.seatsText}</p>}
      {phase === 'S4' && deadlineMs > 0 && <p className="sm-offer-deadline">方案截止倒數 <Countdown ms={deadlineMs} compact /></p>}
      <button type="button" className="sm-btn" onClick={onOpen}>{cta.buttonLabel}</button>
      {cta.fallback && <a className="sm-link" href={cta.fallback.url} target="_blank" rel="noopener noreferrer" onClick={onLine}>{cta.fallback.label}</a>}
    </div>
  );
}

/** 浮動 CTA：說明會後段與結束後出現。 */
export function FloatingCta({ config, phase, deadlineMs, onOpen }: { config: PublicConfig; phase: Phase; deadlineMs: number; onOpen: () => void }) {
  const { cta } = config;
  return (
    <div className="sm-float" role="region" aria-label="報名方案">
      <div className="sm-float-text">
        <b>{cta.floatingLabel}</b>
        <span>
          {cta.mode === 'card' && cta.priceTwd ? <span className="sm-num">{formatTwd(cta.priceTwd)}</span> : cta.productLine || cta.productName}
          {phase === 'S4' && deadlineMs > 0 && <> ・ 截止 <Countdown ms={deadlineMs} compact /></>}
        </span>
      </div>
      <button type="button" className="sm-btn" onClick={onOpen}>{cta.buttonLabel}</button>
    </div>
  );
}

type SheetProps = { config: PublicConfig; demo: boolean; visitor: string; onClose: () => void; track: Track; onLead: () => void; onCheckout: () => void };

/** 四種 CTA 的表單。依設定的 cta.mode 顯示其中一種。 */
export function CtaSheet(props: SheetProps) {
  const { config, onClose } = props;
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    box.current?.querySelector<HTMLElement>('input,button,a')?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [onClose]);
  const titles = { card: '填寫報名資料', form: '填寫報名表', booking: '預約一對一諮詢', lead: '留下聯絡方式' } as const;
  return (
    <div className="sm-sheet-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sm-sheet" role="dialog" aria-modal="true" aria-labelledby="sm-sheet-title" ref={box}>
        <div className="sm-sheet-head">
          <h2 id="sm-sheet-title">{titles[config.cta.mode]}</h2>
          <button type="button" className="sm-icon" onClick={onClose} aria-label="關閉"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" /></svg></button>
        </div>
        <div className="sm-sheet-summary">
          <p>{config.cta.productLine}</p>
          <b>{config.cta.productName}</b>
          <Price cta={config.cta} />
        </div>
        {config.cta.mode === 'card' && <CardForm {...props} />}
        {config.cta.mode === 'form' && <ApplyForm {...props} />}
        {config.cta.mode === 'booking' && <Booking {...props} />}
        {config.cta.mode === 'lead' && <LeadForm {...props} />}
        {config.cta.fallback && <a className="sm-link is-center" href={config.cta.fallback.url} target="_blank" rel="noopener noreferrer" onClick={() => props.track('line_click', 'sheet')}>{config.cta.fallback.label}</a>}
      </div>
    </div>
  );
}

function usePerson() {
  const [p, setP] = useState({ name: '', email: '', phone: '' });
  useEffect(() => { setP(recallPerson()); }, []);
  return [p, setP] as const;
}

function Done({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return <div className="sm-done" role="status"><h3>{title}</h3><p>{body}</p><button type="button" className="sm-btn is-ghost" onClick={onClose}>回到說明會</button></div>;
}

function CardForm({ config, demo, visitor, onClose, track, onCheckout }: SheetProps) {
  const [p, setP] = usePerson();
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  useEffect(() => { track('checkout_open'); }, [track]);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!consent) { setError('請勾選同意。'); track('form_error', 'consent'); return; }
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/checkout`, { ...p, consent, website: trap, visitor, demo });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); track('form_error', 'checkout'); return; }
    rememberPerson(p); onCheckout();
    if (r.data.mode === 'live' && typeof r.data.url === 'string') { window.location.assign(r.data.url); return; }
    setPreview(true);
  };
  if (preview) return <Done title="預覽環境不會付款" body={`資料檢查通過。正式開放後，這一步會前往 PAYUNi 刷卡頁，金額 ${formatTwd(config.cta.priceTwd)}。`} onClose={onClose} />;
  return (
    <form className="sm-form" onSubmit={submit} noValidate>
      <Field label="姓名"><input required autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
      <Field label="手機"><input required type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} /></Field>
      <Field label="Email" hint="付款確認與上課資訊會寄到這裡"><input required type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
      <Consent checked={consent} onChange={setConsent}>{config.cta.terms}</Consent>
      <Trap value={trap} onChange={setTrap} />
      {error && <p className="sm-error" role="alert">{error}</p>}
      <button type="submit" className="sm-btn" disabled={busy}>{busy ? '處理中…' : config.cta.submitLabel}</button>
      <p className="sm-fine">信用卡付款由 PAYUNi 統一金流處理，本站不會經手你的卡號。</p>
    </form>
  );
}

function ApplyForm({ config, demo, visitor, onClose, track, onLead }: SheetProps) {
  const external = /^https:\/\//.test(config.cta.target);
  const [p, setP] = usePerson();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  if (external) {
    return (
      <div className="sm-form">
        <p className="sm-copy">{config.cta.description}</p>
        <a className="sm-btn" href={config.cta.target} target="_blank" rel="noopener noreferrer" onClick={() => { track('cta_click', 'form-external'); onLead(); }}>{config.cta.submitLabel || '開啟報名表'}</a>
      </div>
    );
  }
  if (done) return <Done title={config.cta.successTitle} body={config.cta.successBody} onClose={onClose} />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!consent) { setError('請勾選同意。'); track('form_error', 'consent'); return; }
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/lead`, { type: 'form', ...p, fields, channels: ['email'], consent, website: trap, visitor, demo });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); track('form_error', 'form'); return; }
    rememberPerson(p); onLead(); setDone(true);
  };
  return (
    <form className="sm-form" onSubmit={submit} noValidate>
      <Field label="姓名"><input required autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
      <Field label="Email"><input required type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
      <Field label="手機"><input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} /></Field>
      {config.cta.formFields.map(f => (
        <Field key={f.id} label={f.required ? f.label : `${f.label}（選填）`}>
          {f.type === 'textarea' ? <textarea rows={3} value={fields[f.id] || ''} onChange={e => setFields({ ...fields, [f.id]: e.target.value })} />
            : f.type === 'select' ? <select value={fields[f.id] || ''} onChange={e => setFields({ ...fields, [f.id]: e.target.value })}><option value="">請選擇</option>{(f.options || []).map(o => <option key={o}>{o}</option>)}</select>
              : <input type={f.type} value={fields[f.id] || ''} onChange={e => setFields({ ...fields, [f.id]: e.target.value })} />}
        </Field>
      ))}
      <Consent checked={consent} onChange={setConsent}>{config.cta.terms}</Consent>
      <Trap value={trap} onChange={setTrap} />
      {error && <p className="sm-error" role="alert">{error}</p>}
      <button type="submit" className="sm-btn" disabled={busy}>{busy ? '送出中…' : config.cta.submitLabel}</button>
    </form>
  );
}

function Booking({ config, track, onLead }: SheetProps) {
  const ok = /^https:\/\//.test(config.cta.target);
  return (
    <div className="sm-form">
      <p className="sm-copy">{config.cta.description}</p>
      <ol className="sm-steps">
        <li>按下方按鈕，會開啟預約頁面。</li>
        <li>選一個你方便的時段，填上姓名和 Email。</li>
        <li>預約完成後，確認信會寄到你的信箱。</li>
      </ol>
      {ok ? <a className="sm-btn" href={config.cta.target} target="_blank" rel="noopener noreferrer" onClick={() => { track('cta_click', 'booking'); onLead(); }}>{config.cta.submitLabel || '選擇時段'}</a>
        : <p className="sm-error">預約網址尚未設定。</p>}
    </div>
  );
}

function LeadForm({ config, demo, visitor, onClose, track, onLead }: SheetProps) {
  const [p, setP] = usePerson();
  const [channels, setChannels] = useState(['email']);
  const [consent, setConsent] = useState(false);
  const [trap, setTrap] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  if (done) return <Done title={config.cta.successTitle} body={config.cta.successBody} onClose={onClose} />;
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('');
    if (!channels.length) { setError('請至少選一種通知方式。'); return; }
    if (!consent) { setError('請勾選同意。'); track('form_error', 'consent'); return; }
    setBusy(true);
    const r = await post(`/api/seminar/${config.slug}/lead`, { type: 'lead', ...p, channels, consent, website: trap, visitor, demo });
    setBusy(false);
    if (!r.ok) { setError(String(r.data.error || '送出失敗，請再試一次。')); track('form_error', 'lead'); return; }
    rememberPerson(p); onLead(); setDone(true);
  };
  return (
    <form className="sm-form" onSubmit={submit} noValidate>
      <p className="sm-copy">{config.cta.description}</p>
      <Field label="姓名"><input required autoComplete="name" value={p.name} onChange={e => setP({ ...p, name: e.target.value })} /></Field>
      <Field label="Email"><input required type="email" autoComplete="email" value={p.email} onChange={e => setP({ ...p, email: e.target.value })} /></Field>
      <Field label="手機（選填）"><input type="tel" inputMode="tel" autoComplete="tel" value={p.phone} onChange={e => setP({ ...p, phone: e.target.value })} /></Field>
      <Channels value={channels} onChange={setChannels} />
      {channels.includes('line') && config.contact.lineUrl && <p className="sm-fine">選 LINE 的話，請先<a href={config.contact.lineUrl} target="_blank" rel="noopener noreferrer" onClick={() => track('line_click', 'lead')}>加入官方帳號</a>。</p>}
      <Consent checked={consent} onChange={setConsent}>{config.cta.terms}</Consent>
      <Trap value={trap} onChange={setTrap} />
      {error && <p className="sm-error" role="alert">{error}</p>}
      <button type="submit" className="sm-btn" disabled={busy}>{busy ? '送出中…' : config.cta.submitLabel}</button>
    </form>
  );
}
