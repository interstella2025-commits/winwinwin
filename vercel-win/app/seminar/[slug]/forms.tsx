'use client';

import { useState, type ReactNode } from 'react';

export async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, data };
  } catch {
    return { ok: false, data: { error: '網路連線不穩，請再試一次。' } };
  }
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="sm-field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

export function Consent({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return <label className="sm-check"><input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} /><span>{children}</span></label>;
}

export function Channels({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c]);
  return (
    <fieldset className="sm-channels">
      <legend>用哪裡通知你</legend>
      <label className="sm-check"><input type="checkbox" checked={value.includes('email')} onChange={() => toggle('email')} /><span>Email</span></label>
      <label className="sm-check"><input type="checkbox" checked={value.includes('line')} onChange={() => toggle('line')} /><span>LINE</span></label>
    </fieldset>
  );
}

/** 隱藏欄位，擋機器人。 */
export function Trap({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="sm-trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={value} onChange={e => onChange(e.target.value)} name="website" />;
}

export function useForm<T extends Record<string, string>>(init: T) {
  const [values, setValues] = useState(init);
  const set = (k: keyof T) => (e: { target: { value: string } }) => setValues(v => ({ ...v, [k]: e.target.value }));
  return { values, setValues, set };
}

export const PERSON_KEY = 'seminar:person';
export function rememberPerson(p: { name: string; email: string; phone?: string }) {
  try { localStorage.setItem(PERSON_KEY, JSON.stringify(p)); } catch { /* 無痕模式 */ }
}
export function recallPerson(): { name: string; email: string; phone: string } {
  try { const p = JSON.parse(localStorage.getItem(PERSON_KEY) || '{}'); return { name: p.name || '', email: p.email || '', phone: p.phone || '' }; } catch { return { name: '', email: '', phone: '' }; }
}
