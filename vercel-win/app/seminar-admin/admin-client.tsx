'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { formatTimestamp, formatTwd, parseTimestamp } from '@/lib/seminar/clock';
import type { CtaMode, FormField, MessageKind, NotifyTemplate, SeminarConfig } from '@/lib/seminar/types';

type Me = { role: string; roleLabel: string; who: string; permissions: string[]; durable: boolean; checkoutLive: boolean; emailEnabled: boolean };
type Project = { slug: string; name: string; kind: string; custom: boolean };
type Screen = 'session' | 'video' | 'notes' | 'chat' | 'offer' | 'leads' | 'stats' | 'notify' | 'members';
const SCREENS: Array<[Screen, string]> = [['session', '場次'], ['video', '影片'], ['notes', '重點提示'], ['chat', '即時訊息與互動'], ['offer', '優惠與 CTA'], ['leads', '名單'], ['stats', '數據'], ['notify', '通知'], ['members', '成員']];
const MODE_HELP: Record<CtaMode, string> = {
  card: '觀眾填姓名、手機、Email 後前往 PAYUNi 付款頁。要另外開啟付款開關才會真的收款。',
  form: '內建報名表（可加自訂欄位），或填外部表單網址改成另開視窗。',
  booking: '按鈕開啟預約網址（例如 Calendly），讓觀眾自己選時段。',
  lead: '留下姓名、Email、手機與想用 Email 或 LINE 聯絡，之後由團隊跟進。',
};
const KIND_LABEL: Record<MessageKind, string> = { announcement: '公告', faq: '常見問題', note: '提醒', feedback: '學員回饋' };
const LEAD_TYPE: Record<string, string> = { reminder: '預約提醒', lead: '留名單', form: '填表', notes: '寄筆記' };

async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const r = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, cache: 'no-store' });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { error: '網路連線失敗。' } as T & { error?: string } }; }
}
const toLocal = (iso: string) => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t + 8 * 3600_000).toISOString().slice(0, 16) : ''; };
const fromLocal = (v: string) => (v ? `${v}:00+08:00` : '');
const when = (iso: string) => new Date(iso).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function AdminClient({ modes }: { modes: Array<{ id: CtaMode; label: string }> }) {
  const [me, setMe] = useState<Me | null>(null);
  const [checked, setChecked] = useState(false);
  const loadMe = useCallback(async () => { const r = await api<Me>('/api/seminar-admin/me'); setMe(r.ok ? r.data : null); setChecked(true); }, []);
  useEffect(() => { loadMe(); }, [loadMe]);
  if (!checked) return <div className="sa sa-center"><p>載入中…</p></div>;
  if (!me) return <Login onDone={loadMe} />;
  return <Console me={me} modes={modes} onLogout={async () => { await api('/api/seminar-admin/logout', { method: 'POST' }); setMe(null); }} />;
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('');
    const r = await api('/api/seminar-admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    setBusy(false);
    if (!r.ok) { setError(r.data.error || '登入失敗。'); return; }
    setPassword(''); onDone();
  };
  return (
    <div className="sa sa-center">
      <form className="sa-login" onSubmit={submit}>
        <h1>說明會後台</h1>
        <p>擁有者帳號留空，直接輸入後台密碼。成員請輸入 Email 和自己的密碼。</p>
        <label>Email（成員才需要）<input type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>密碼<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        {error && <p className="sa-error" role="alert">{error}</p>}
        <button className="sa-primary" disabled={busy}>{busy ? '登入中…' : '登入'}</button>
      </form>
    </div>
  );
}

function Console({ me, modes, onLogout }: { me: Me; modes: Array<{ id: CtaMode; label: string }>; onLogout: () => void }) {
  const can = (p: string) => me.permissions.includes(p);
  const [projects, setProjects] = useState<Project[]>([]);
  const [slug, setSlug] = useState('template');
  const [screen, setScreen] = useState<Screen>('session');
  const [cfg, setCfg] = useState<SeminarConfig | null>(null);
  const [saved, setSaved] = useState<SeminarConfig | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const loadProjects = useCallback(async () => { const r = await api<{ projects: Project[] }>('/api/seminar-admin/projects'); if (r.ok) setProjects(r.data.projects); }, []);
  const loadConfig = useCallback(async (s: string) => {
    const r = await api<{ config: SeminarConfig; problems: string[] }>(`/api/seminar-admin/${s}/config`);
    if (r.ok) { setCfg(r.data.config); setSaved(r.data.config); setProblems(r.data.problems); }
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { loadConfig(slug); }, [slug, loadConfig]);
  const dirty = useMemo(() => JSON.stringify(cfg) !== JSON.stringify(saved), [cfg, saved]);
  const set = useCallback(<K extends keyof SeminarConfig>(k: K, v: SeminarConfig[K]) => setCfg(c => (c ? { ...c, [k]: v } : c)), []);
  const save = async () => {
    if (!cfg) return; setBusy(true); setMsg('');
    const r = await api<{ config: SeminarConfig; problems: string[]; durable: boolean }>(`/api/seminar-admin/${slug}/config`, { method: 'PUT', body: JSON.stringify({ config: cfg }) });
    setBusy(false);
    if (!r.ok) { setMsg(r.data.error || '儲存失敗。'); return; }
    setCfg(r.data.config); setSaved(r.data.config); setProblems(r.data.problems);
    setMsg(r.data.durable ? '已儲存。' : '已儲存（預覽環境：重新部署後會回到預設值）。');
  };
  const duplicate = async () => {
    const to = window.prompt('新場次的網址代號（小寫英文、數字、連字號），例如 course-2027-01');
    if (!to) return;
    const r = await api<{ slug: string }>(`/api/seminar-admin/${slug}/config`, { method: 'POST', body: JSON.stringify({ to }) });
    if (!r.ok) { setMsg(r.data.error || '複製失敗。'); return; }
    await loadProjects(); setSlug(r.data.slug); setMsg('已複製成新場次。');
  };
  const reset = async () => {
    if (!window.confirm('確定要清除後台的修改？程式內建的場次會回到預設值，複製出來的場次會被刪除。')) return;
    const r = await api(`/api/seminar-admin/${slug}/config`, { method: 'DELETE' });
    if (!r.ok) { setMsg(r.data.error || '失敗。'); return; }
    await loadProjects();
    if (projects.find(p => p.slug === slug)?.custom) setSlug('template'); else loadConfig(slug);
    setMsg('已還原。');
  };
  const configScreens: Screen[] = ['session', 'video', 'notes', 'chat', 'offer', 'notify'];

  return (
    <div className="sa">
      <div className="sa-top">
        <div className="sa-brand"><b>說明會後台</b><span>{me.roleLabel}{me.who && me.who !== 'owner' && me.who !== me.roleLabel ? `・${me.who}` : ''}</span></div>
        <div className="sa-top-right">
          <select aria-label="選擇場次" value={slug} onChange={e => { if (!dirty || window.confirm('有未儲存的修改，確定要切換？')) setSlug(e.target.value); }}>
            {projects.map(p => <option key={p.slug} value={p.slug}>{p.name}（{p.slug}）</option>)}
          </select>
          <button type="button" className="sa-text" onClick={onLogout}>登出</button>
        </div>
      </div>
      {!me.durable && <p className="sa-warn">目前是預覽環境，資料存在伺服器記憶體，重新部署或閒置一段時間後會清空。正式使用前要切換到資料庫。</p>}
      <div className="sa-body">
        <nav className="sa-nav" aria-label="後台選單">
          {SCREENS.filter(([s]) => s !== 'members' || can('members')).map(([s, label], i) => <button key={s} type="button" aria-current={screen === s ? 'page' : undefined} onClick={() => setScreen(s)}><span>B{i + 1}</span>{label}</button>)}
        </nav>
        <div className="sa-main">
          {cfg && configScreens.includes(screen) && (
            <div className="sa-bar">
              <div className="sa-links">
                <a href={`/seminar/${slug}?demo=1`} target="_blank" rel="noopener noreferrer">示範預覽</a>
                <a href={`/seminar/${slug}`} target="_blank" rel="noopener noreferrer">實際頁面</a>
                {can('config') && <button type="button" className="sa-text" onClick={duplicate}>複製成新場次</button>}
                {can('pricing') && <button type="button" className="sa-text" onClick={reset}>還原</button>}
              </div>
              <div className="sa-save">
                {msg && <span role="status">{msg}</span>}
                {can('config') && <button type="button" className="sa-primary" disabled={!dirty || busy} onClick={save}>{busy ? '儲存中…' : dirty ? '儲存' : '已儲存'}</button>}
              </div>
            </div>
          )}
          {cfg && configScreens.includes(screen) && problems.length > 0 && <div className="sa-problems"><b>公開前要處理</b><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul></div>}
          {!cfg && <p>載入中…</p>}
          {cfg && screen === 'session' && <SessionScreen cfg={cfg} set={set} />}
          {cfg && screen === 'video' && <VideoScreen cfg={cfg} set={set} />}
          {cfg && screen === 'notes' && <NotesScreen cfg={cfg} set={set} />}
          {cfg && screen === 'chat' && <ChatScreen cfg={cfg} set={set} slug={slug} canModerate={can('questions')} />}
          {cfg && screen === 'offer' && <OfferScreen cfg={cfg} set={set} modes={modes} me={me} canPrice={can('pricing')} slug={slug} />}
          {screen === 'leads' && <LeadsScreen slug={slug} canFull={can('leadsFull')} />}
          {screen === 'stats' && <StatsScreen slug={slug} />}
          {cfg && screen === 'notify' && <NotifyScreen cfg={cfg} set={set} slug={slug} canApprove={can('approve')} emailEnabled={me.emailEnabled} />}
          {screen === 'members' && can('members') && <MembersScreen />}
        </div>
      </div>
    </div>
  );
}

type SetFn = <K extends keyof SeminarConfig>(k: K, v: SeminarConfig[K]) => void;

function Card({ title, children, help }: { title: string; children: ReactNode; help?: string }) {
  return <div className="sa-card"><h2>{title}</h2>{help && <p className="sa-help">{help}</p>}{children}</div>;
}
function Text({ label, value, onChange, area, type = 'text', help }: { label: string; value: string | number; onChange: (v: string) => void; area?: boolean; type?: string; help?: string }) {
  return <label className="sa-field"><span>{label}</span>{area ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} />}{help && <small>{help}</small>}</label>;
}
function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return <label className="sa-toggle"><input type="checkbox" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} /><span>{label}</span></label>;
}
function TimeInput({ label, seconds, onChange }: { label: string; seconds: number; onChange: (s: number) => void }) {
  const [v, setV] = useState(formatTimestamp(seconds));
  useEffect(() => { setV(formatTimestamp(seconds)); }, [seconds]);
  return <label className="sa-field is-time"><span>{label}</span><input value={v} inputMode="numeric" placeholder="00:00:00" onChange={e => setV(e.target.value)} onBlur={() => { const s = parseTimestamp(v); if (s === null) setV(formatTimestamp(seconds)); else onChange(s); }} /></label>;
}
function Rows<T>({ items, onChange, make, render, addLabel }: { items: T[]; onChange: (v: T[]) => void; make: () => T; render: (item: T, update: (patch: Partial<T>) => void) => ReactNode; addLabel: string }) {
  return (
    <div className="sa-rows">
      {items.map((it, i) => (
        <div className="sa-row" key={i}>
          <div className="sa-row-fields">{render(it, patch => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}</div>
          <div className="sa-row-tools">
            <button type="button" className="sa-text" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }} aria-label="上移">上移</button>
            <button type="button" className="sa-text" onClick={() => onChange(items.filter((_, j) => j !== i))}>刪除</button>
          </div>
        </div>
      ))}
      <button type="button" className="sa-secondary" onClick={() => onChange([...items, make()])}>{addLabel}</button>
    </div>
  );
}

function SessionScreen({ cfg, set }: { cfg: SeminarConfig; set: SetFn }) {
  const s = cfg.schedule;
  return (
    <>
      <Card title="時間">
        <div className="sa-grid">
          <Text label="開始時間（台北）" type="datetime-local" value={toLocal(s.startAt)} onChange={v => set('schedule', { ...s, startAt: fromLocal(v) })} />
          <Text label="說明會長度（分鐘）" type="number" value={Math.round(s.durationSeconds / 60)} onChange={v => set('schedule', { ...s, durationSeconds: Math.max(1, Number(v) || 0) * 60 })} />
          <Text label="開始前幾分鐘進入「即將開始」" type="number" value={s.soonMinutes} onChange={v => set('schedule', { ...s, soonMinutes: Math.max(0, Number(v) || 0) })} />
          <Text label="場次代號" value={s.sessionCode} onChange={v => set('schedule', { ...s, sessionCode: v })} help="換場次時改一下，觀眾的筆記才不會混在一起。" />
          <Text label="下一場名稱" value={s.nextSession?.label || ''} onChange={v => set('schedule', { ...s, nextSession: v ? { label: v, url: s.nextSession?.url || '' } : null })} />
          <Text label="下一場網址" value={s.nextSession?.url || ''} onChange={v => set('schedule', { ...s, nextSession: s.nextSession ? { ...s.nextSession, url: v } : null })} />
        </div>
      </Card>
      <Card title="品牌與標題">
        <div className="sa-grid">
          <Text label="品牌名稱" value={cfg.brand.name} onChange={v => set('brand', { ...cfg.brand, name: v })} />
          <Text label="頁首英文字標" value={cfg.brand.mark} onChange={v => set('brand', { ...cfg.brand, mark: v })} />
          <Text label="小標" value={cfg.copy.eyebrow} onChange={v => set('copy', { ...cfg.copy, eyebrow: v })} />
          <Text label="主標（一行一句）" area value={cfg.copy.titleLines.join('\n')} onChange={v => set('copy', { ...cfg.copy, titleLines: v.split('\n') })} />
          <Text label="副標" value={cfg.copy.subtitle} onChange={v => set('copy', { ...cfg.copy, subtitle: v })} />
          <Text label="預約區說明" area value={cfg.copy.hook} onChange={v => set('copy', { ...cfg.copy, hook: v })} />
          <Text label="主視覺圖片網址" value={cfg.cover} onChange={v => set('cover', v)} help="橫式照片，人物頭部不要靠近上緣。" />
        </div>
      </Card>
      <Card title="講者">
        <div className="sa-grid">
          <Text label="姓名" value={cfg.speaker.name} onChange={v => set('speaker', { ...cfg.speaker, name: v })} />
          <Text label="介紹" value={cfg.speaker.title} onChange={v => set('speaker', { ...cfg.speaker, title: v })} />
          <Text label="大頭照網址" value={cfg.speaker.avatar} onChange={v => set('speaker', { ...cfg.speaker, avatar: v })} help="正方形，頭部完整。" />
        </div>
      </Card>
      <Card title="結束畫面文字">
        <div className="sa-grid">
          <Text label="說明會結束標題" value={cfg.copy.endedTitle} onChange={v => set('copy', { ...cfg.copy, endedTitle: v })} />
          <Text label="說明會結束說明" value={cfg.copy.endedBody} onChange={v => set('copy', { ...cfg.copy, endedBody: v })} />
          <Text label="方案截止標題" value={cfg.copy.offerClosedTitle} onChange={v => set('copy', { ...cfg.copy, offerClosedTitle: v })} />
          <Text label="方案截止說明" value={cfg.copy.offerClosedBody} onChange={v => set('copy', { ...cfg.copy, offerClosedBody: v })} />
        </div>
      </Card>
      <Card title="說明會內容區">
        <h3>會談到的重點</h3>
        <Rows items={cfg.highlights} onChange={v => set('highlights', v)} make={() => ({ title: '', body: '' })} addLabel="新增重點" render={(h, u) => <><Text label="標題" value={h.title} onChange={v => u({ title: v })} /><Text label="說明" value={h.body} onChange={v => u({ body: v })} /></>} />
        <h3>適合誰（一行一個）</h3>
        <Text label="適合對象" area value={cfg.audience.join('\n')} onChange={v => set('audience', v.split('\n'))} />
        <h3>常見問題</h3>
        <Rows items={cfg.faqs} onChange={v => set('faqs', v)} make={() => ({ q: '', a: '' })} addLabel="新增問題" render={(f, u) => <><Text label="問題" value={f.q} onChange={v => u({ q: v })} /><Text label="回答" area value={f.a} onChange={v => u({ a: v })} /></>} />
      </Card>
      <Card title="顏色、聯絡方式與追蹤">
        <div className="sa-colors">
          {([['bg', '背景'], ['surface', '卡片'], ['ink', '文字'], ['muted', '次要文字'], ['accent', '強調色'], ['line', '分隔線'], ['onAccent', '按鈕文字']] as const).map(([k, label]) => (
            <label key={k}><input type="color" value={cfg.theme[k]} onChange={e => set('theme', { ...cfg.theme, [k]: e.target.value })} /><span>{label}</span></label>
          ))}
        </div>
        <div className="sa-grid">
          <Text label="LINE 官方帳號網址" value={cfg.contact.lineUrl} onChange={v => set('contact', { ...cfg.contact, lineUrl: v })} />
          <Text label="LINE 按鈕文字" value={cfg.contact.lineLabel} onChange={v => set('contact', { ...cfg.contact, lineLabel: v })} />
          <Text label="聯絡 Email" value={cfg.contact.email} onChange={v => set('contact', { ...cfg.contact, email: v })} />
          <Text label="Meta Pixel ID" value={cfg.tracking.metaPixelId} onChange={v => set('tracking', { metaPixelId: v.replace(/\D/g, '') })} help="每個專案用自己的。留空就不載入。" />
        </div>
      </Card>
    </>
  );
}

function VideoScreen({ cfg, set }: { cfg: SeminarConfig; set: SetFn }) {
  const v = cfg.video;
  return (
    <>
      <Card title="影片來源" help="觀眾不能快轉或倒轉，所有人同一時間看到同一段。說明會不開放重播。">
        <div className="sa-grid">
          <label className="sa-field"><span>來源</span><select value={v.provider} onChange={e => set('video', { ...v, provider: e.target.value as SeminarConfig['video']['provider'] })}><option value="hls">HLS（.m3u8）</option><option value="mp4">MP4 檔案</option><option value="vimeo">Vimeo</option><option value="youtube">YouTube（不公開）</option></select></label>
          {v.provider === 'hls' || v.provider === 'mp4' ? <Text label="影片網址" value={v.url} onChange={x => set('video', { ...v, url: x })} /> : <Text label="影片 ID" value={v.id} onChange={x => set('video', { ...v, id: x })} />}
          {v.provider === 'vimeo' && <Text label="Vimeo 私人連結 hash（選填）" value={v.hash} onChange={x => set('video', { ...v, hash: x })} />}
        </div>
        <Toggle label="這是範例影片（畫面上會標示「範例影片」，影片比場次短時循環播放）" checked={v.sample} onChange={x => set('video', { ...v, sample: x })} />
        <p className="sa-help">HLS 與 MP4 會每 2 秒對齊伺服器時間；Vimeo、YouTube 只在進場時對齊一次。</p>
      </Card>
      <Card title="章節">
        <Rows items={v.chapters} onChange={c => set('video', { ...v, chapters: c })} make={() => ({ at: 0, title: '' })} addLabel="新增章節" render={(c, u) => <><TimeInput label="開始時間" seconds={c.at} onChange={s => u({ at: s })} /><Text label="章節名稱" value={c.title} onChange={x => u({ title: x })} /></>} />
      </Card>
    </>
  );
}

function NotesScreen({ cfg, set }: { cfg: SeminarConfig; set: SetFn }) {
  return (
    <Card title="筆記重點" help="影片播到指定時間，畫面下方會出現重點卡，觀眾可以存到自己的筆記。說明會結束後，存下的重點會寄給有留 Email 或 LINE 的人。">
      <Rows items={cfg.notes} onChange={v => set('notes', v)} make={() => ({ id: `n${Date.now().toString(36)}`, at: 0, chapter: '', text: '', holdSeconds: 12, preset: true, enabled: true })} addLabel="新增重點" render={(n, u) => <>
        <TimeInput label="出現時間" seconds={n.at} onChange={s => u({ at: s })} />
        <Text label="停留秒數" type="number" value={n.holdSeconds} onChange={x => u({ holdSeconds: Math.max(3, Number(x) || 0) })} />
        <Text label="章節" value={n.chapter} onChange={x => u({ chapter: x })} />
        <Text label="重點內容" area value={n.text} onChange={x => u({ text: x })} />
        <Toggle label="顯示" checked={n.enabled} onChange={x => u({ enabled: x })} />
      </>} />
    </Card>
  );
}

type Q = { id: string; createdAt: string; name: string; body: string; status: string; reply: string; position: number; contact: string; demo?: boolean };
function ChatScreen({ cfg, set, slug, canModerate }: { cfg: SeminarConfig; set: SetFn; slug: string; canModerate: boolean }) {
  const [qs, setQs] = useState<Q[]>([]);
  const [filter, setFilter] = useState('pending');
  const load = useCallback(async () => { const r = await api<{ rows: Q[] }>(`/api/seminar-admin/${slug}/records?view=questions`); if (r.ok) setQs(r.data.rows); }, [slug]);
  useEffect(() => { if (canModerate) load(); }, [load, canModerate]);
  const patch = async (id: string, body: Record<string, unknown>) => { await api(`/api/seminar-admin/${slug}/records`, { method: 'PATCH', body: JSON.stringify({ id, ...body }) }); load(); };
  return (
    <>
      {canModerate && (
        <Card title="觀眾提問" help="觀眾送出的問題先進待審，按「顯示」後所有人都看得到；回覆會出現在問題下方。">
          <div className="sa-filter">{[['pending', '待審'], ['shown', '已顯示'], ['hidden', '已隱藏']].map(([k, l]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}（{qs.filter(q => q.status === k).length}）</button>)}<button type="button" className="sa-text" onClick={load}>重新整理</button></div>
          {qs.filter(q => q.status === filter).length === 0 ? <p className="sa-empty">沒有資料。</p> : (
            <ul className="sa-list">
              {qs.filter(q => q.status === filter).map(q => <QuestionRow key={q.id} q={q} patch={patch} />)}
            </ul>
          )}
        </Card>
      )}
      <Card title="預排訊息" help="影片播到指定時間時出現在訊息區。勾選「標示預先準備」時，每則預排訊息旁會寫「預先準備」，避免誤會是即時回覆。">
        <Toggle label="標示預先準備" checked={cfg.labelScripted} onChange={v => set('labelScripted', v)} />
        <Rows<SeminarConfig['messages'][number]> items={cfg.messages} onChange={v => set('messages', v)} make={() => ({ id: `m${Date.now().toString(36)}`, at: 0, kind: 'announcement' as MessageKind, name: cfg.brand.name, body: '' })} addLabel="新增訊息" render={(m, u) => <>
          <TimeInput label="出現時間" seconds={m.at} onChange={s => u({ at: s })} />
          <label className="sa-field"><span>類型</span><select value={m.kind} onChange={e => u({ kind: e.target.value as MessageKind })}>{Object.entries(KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
          <Text label="署名" value={m.name} onChange={x => u({ name: x })} />
          <Text label="內容" area value={m.body} onChange={x => u({ body: x })} />
          <Toggle label="置頂" checked={!!m.pinned} onChange={x => u({ pinned: x })} />
          {m.kind === 'feedback' && <Toggle label="已取得本人同意公開（沒勾不會顯示）" checked={!!m.consent} onChange={x => u({ consent: x })} />}
        </>} />
      </Card>
      <Card title="提問設定">
        <Toggle label="開放觀眾提問" checked={cfg.questions.enabled} onChange={v => set('questions', { ...cfg.questions, enabled: v })} />
        <Toggle label="提問要先審核才顯示" checked={cfg.questions.moderated} onChange={v => set('questions', { ...cfg.questions, moderated: v })} />
        <Text label="輸入框提示文字" value={cfg.questions.placeholder} onChange={v => set('questions', { ...cfg.questions, placeholder: v })} />
      </Card>
    </>
  );
}
function QuestionRow({ q, patch }: { q: Q; patch: (id: string, b: Record<string, unknown>) => void }) {
  const [reply, setReply] = useState(q.reply || '');
  return (
    <li className="sa-q">
      <p className="sa-meta">{when(q.createdAt)}・{q.name}・影片 {formatTimestamp(q.position)}{q.contact ? '・有留聯絡方式' : ''}{q.demo ? '・示範' : ''}</p>
      <p>{q.body}</p>
      <div className="sa-q-tools">
        <input value={reply} placeholder="回覆（選填）" onChange={e => setReply(e.target.value)} />
        <button type="button" className="sa-secondary" onClick={() => patch(q.id, { reply, status: 'shown' })}>{q.status === 'shown' ? '更新回覆' : '顯示'}</button>
        {q.status !== 'hidden' && <button type="button" className="sa-text" onClick={() => patch(q.id, { status: 'hidden' })}>隱藏</button>}
      </div>
    </li>
  );
}

function OfferScreen({ cfg, set, modes, me, canPrice, slug }: { cfg: SeminarConfig; set: SetFn; modes: Array<{ id: CtaMode; label: string }>; me: Me; canPrice: boolean; slug: string }) {
  const c = cfg.cta; const s = cfg.schedule;
  const u = (patch: Partial<SeminarConfig['cta']>) => set('cta', { ...c, ...patch });
  return (
    <>
      <Card title="CTA 模式" help={canPrice ? undefined : '修改模式、價格與截止時間需要管理者權限。'}>
        <div className="sa-modes">
          {modes.map(m => (
            <label key={m.id} className={c.mode === m.id ? 'is-on' : ''}>
              <input type="radio" name="mode" disabled={!canPrice} checked={c.mode === m.id} onChange={() => u({ mode: m.id })} />
              <b>{m.label}</b><span>{MODE_HELP[m.id]}</span>
            </label>
          ))}
        </div>
        <p className="sa-help"><a href={`/seminar/${slug}?demo=1&at=S3&cta=${c.mode}`} target="_blank" rel="noopener noreferrer">用示範模式看這個 CTA</a></p>
        {c.mode === 'card' && <p className="sa-help">付款狀態：{me.checkoutLive ? '已開啟，會真的收款' : '未開啟（按下只會檢查資料，不會付款）'}。測試請用 NT$1，經擁有者同意後才開啟。</p>}
      </Card>
      <Card title="時間">
        <div className="sa-grid">
          <TimeInput label="影片第幾分鐘出現方案" seconds={s.offerAtSeconds} onChange={x => set('schedule', { ...s, offerAtSeconds: x })} />
          <Text label="方案截止（台北，留空＝說明會結束時）" type="datetime-local" value={toLocal(s.offerDeadline)} onChange={v => set('schedule', { ...s, offerDeadline: fromLocal(v) })} />
        </div>
      </Card>
      <Card title="方案內容">
        <div className="sa-grid">
          <Text label="方案小標" value={c.productLine} onChange={v => u({ productLine: v })} />
          <Text label="方案名稱" value={c.productName} onChange={v => u({ productName: v })} />
          <Text label="說明" area value={c.description} onChange={v => u({ description: v })} />
          {c.mode === 'card' && <>
            <Text label="說明會限定價（元）" type="number" value={c.priceTwd} onChange={v => u({ priceTwd: Math.max(0, Number(v) || 0) })} help={c.priceTwd ? formatTwd(c.priceTwd) : ''} />
            <Text label="原價（元，0＝不顯示）" type="number" value={c.originalPriceTwd} onChange={v => u({ originalPriceTwd: Math.max(0, Number(v) || 0) })} />
          </>}
          <Text label="名額說明（選填，必須是真實數字）" value={c.seatsText} onChange={v => u({ seatsText: v })} />
          <Text label="方案卡按鈕" value={c.buttonLabel} onChange={v => u({ buttonLabel: v })} />
          <Text label="浮動列文字" value={c.floatingLabel} onChange={v => u({ floatingLabel: v })} />
          <Text label="表單送出按鈕" value={c.submitLabel} onChange={v => u({ submitLabel: v })} />
          <Text label="同意條款文字" area value={c.terms} onChange={v => u({ terms: v })} />
          <Text label={c.mode === 'card' ? '方案代碼' : c.mode === 'booking' ? '預約網址（https）' : c.mode === 'form' ? '外部表單網址（留空＝用內建表單）' : '（留名單不需要）'} value={c.target} onChange={v => u({ target: v })} />
          <Text label="送出後標題" value={c.successTitle} onChange={v => u({ successTitle: v })} />
          <Text label="送出後說明" value={c.successBody} onChange={v => u({ successBody: v })} />
          <Text label="備用連結文字（例如先問真人）" value={c.fallback?.label || ''} onChange={v => u({ fallback: v ? { label: v, url: c.fallback?.url || cfg.contact.lineUrl } : null })} />
          <Text label="備用連結網址" value={c.fallback?.url || ''} onChange={v => u({ fallback: c.fallback ? { ...c.fallback, url: v } : null })} />
        </div>
      </Card>
      {c.mode === 'form' && !/^https:\/\//.test(c.target) && (
        <Card title="報名表自訂欄位" help="姓名、Email、手機是固定欄位，這裡加其他問題。">
          <Rows<FormField> items={c.formFields} onChange={v => u({ formFields: v })} make={() => ({ id: `f${Date.now().toString(36)}`, label: '', type: 'text', required: false })} addLabel="新增欄位" render={(f, uf) => <>
            <Text label="題目" value={f.label} onChange={x => uf({ label: x })} />
            <label className="sa-field"><span>格式</span><select value={f.type} onChange={e => uf({ type: e.target.value as FormField['type'] })}><option value="text">短答</option><option value="textarea">長答</option><option value="select">選單</option><option value="email">Email</option><option value="tel">電話</option></select></label>
            {f.type === 'select' && <Text label="選項（用逗號分開）" value={(f.options || []).join(',')} onChange={x => uf({ options: x.split(',').map(o => o.trim()).filter(Boolean) })} />}
            <Toggle label="必填" checked={f.required} onChange={x => uf({ required: x })} />
          </>} />
        </Card>
      )}
    </>
  );
}

type Lead = { id: string; createdAt: string; type: string; name: string; email: string; phone: string; channels?: string[]; fields?: Record<string, string>; followed?: boolean; memo?: string; demo?: boolean };
function LeadsScreen({ slug, canFull }: { slug: string; canFull: boolean }) {
  const [rows, setRows] = useState<Lead[]>([]);
  const [type, setType] = useState('all');
  const [demo, setDemo] = useState(false);
  const load = useCallback(async () => { const r = await api<{ rows: Lead[] }>(`/api/seminar-admin/${slug}/records?view=leads`); if (r.ok) setRows(r.data.rows); }, [slug]);
  useEffect(() => { load(); }, [load]);
  const list = rows.filter(r => (type === 'all' || r.type === type) && (demo || !r.demo));
  const follow = async (r: Lead) => { await api(`/api/seminar-admin/${slug}/records`, { method: 'PATCH', body: JSON.stringify({ id: r.id, followed: !r.followed, memo: r.memo || '' }) }); load(); };
  return (
    <Card title="名單" help={canFull ? undefined : '你的權限只能看到遮蔽後的 Email 與手機。'}>
      <div className="sa-filter">
        {[['all', '全部'], ...Object.entries(LEAD_TYPE)].map(([k, l]) => <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}>{l}（{rows.filter(r => (k === 'all' || r.type === k) && (demo || !r.demo)).length}）</button>)}
      </div>
      <div className="sa-filter">
        <Toggle label="包含示範資料" checked={demo} onChange={setDemo} />
        <a className="sa-secondary" href={`/api/seminar-admin/${slug}/export${demo ? '?demo=1' : ''}`}>匯出 CSV</a>
        <button type="button" className="sa-text" onClick={load}>重新整理</button>
      </div>
      {list.length === 0 ? <p className="sa-empty">還沒有名單。</p> : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead><tr><th>時間</th><th>類型</th><th>姓名</th><th>Email</th><th>手機</th><th>管道</th><th>內容</th><th>已聯絡</th></tr></thead>
            <tbody>{list.map(r => (
              <tr key={r.id}>
                <td>{when(r.createdAt)}</td><td>{LEAD_TYPE[r.type] || r.type}{r.demo ? '・示範' : ''}</td><td>{r.name}</td><td>{r.email}</td><td>{r.phone}</td><td>{(r.channels || []).join('/')}</td>
                <td>{Object.entries(r.fields || {}).map(([k, v]) => `${k}：${v}`).join('；')}</td>
                <td><input type="checkbox" aria-label="已聯絡" checked={!!r.followed} onChange={() => follow(r)} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

type Stats = { reserved: number; joined: number; attendance: number | null; peak: number; avgWatchMinutes: number; curve: Array<{ minute: number; viewers: number }>; progress: Record<string, number>; offerViews: number; ctaClicks: number; checkoutOpens: number; formErrors: number; lineClicks: number; leads: number; leadsByType: Record<string, number>; noteSaves: Record<string, number>; paid: number; conversion: number | null };
function StatsScreen({ slug }: { slug: string }) {
  const [s, setS] = useState<Stats | null>(null);
  const [demo, setDemo] = useState(false);
  const load = useCallback(async () => { const r = await api<Stats>(`/api/seminar-admin/${slug}/stats${demo ? '?demo=1' : ''}`); if (r.ok) setS(r.data); }, [slug, demo]);
  useEffect(() => { load(); }, [load]);
  if (!s) return <p>載入中…</p>;
  const max = Math.max(1, ...s.curve.map(c => c.viewers));
  const tiles: Array<[string, string]> = [['預約', String(s.reserved)], ['實際進場', String(s.joined)], ['出席率', s.attendance === null ? '—' : `${s.attendance}%`], ['最高同時在線', String(s.peak)], ['平均觀看', `${s.avgWatchMinutes} 分`], ['看到方案', String(s.offerViews)], ['按 CTA', String(s.ctaClicks)], ['開啟結帳', String(s.checkoutOpens)], ['付款成功', String(s.paid)], ['轉換率', s.conversion === null ? '—' : `${s.conversion}%`], ['留下名單', String(s.leads)], ['點 LINE', String(s.lineClicks)]];
  return (
    <>
      <Card title="總覽" help="數字只來自實際紀錄。預設不含示範資料。">
        <div className="sa-filter"><Toggle label="包含示範資料" checked={demo} onChange={setDemo} /><button type="button" className="sa-text" onClick={load}>重新整理</button></div>
        <div className="sa-tiles">{tiles.map(([l, v]) => <div key={l}><span>{l}</span><b>{v}</b></div>)}</div>
      </Card>
      <Card title="每分鐘在線人數">
        {s.curve.length === 0 ? <p className="sa-empty">還沒有觀看紀錄。</p> : (
          <div className="sa-curve" role="img" aria-label="每分鐘在線人數">{s.curve.map(c => <div key={c.minute} title={`第 ${c.minute} 分鐘：${c.viewers} 人`} style={{ height: `${(c.viewers / max) * 100}%` }} />)}</div>
        )}
      </Card>
      <Card title="看完比例與互動">
        <div className="sa-tiles">{[25, 50, 75, 100].map(p => <div key={p}><span>看到 {p}%</span><b>{s.progress[p] || 0}</b></div>)}<div><span>表單錯誤</span><b>{s.formErrors}</b></div></div>
        <h3>各類名單</h3>
        <div className="sa-tiles">{Object.entries(s.leadsByType).map(([k, v]) => <div key={k}><span>{LEAD_TYPE[k] || k}</span><b>{v}</b></div>)}</div>
        <h3>最常被存下的重點</h3>
        {Object.keys(s.noteSaves).length === 0 ? <p className="sa-empty">還沒有。</p> : <ul className="sa-list">{Object.entries(s.noteSaves).sort((a, b) => b[1] - a[1]).map(([k, v]) => <li key={k}>{k}：{v} 次</li>)}</ul>}
      </Card>
    </>
  );
}

type Log = { id: string; createdAt: string; template: string; to: string; channel: string; status: string; subject: string };
function NotifyScreen({ cfg, set, slug, canApprove, emailEnabled }: { cfg: SeminarConfig; set: SetFn; slug: string; canApprove: boolean; emailEnabled: boolean }) {
  const [preview, setPreview] = useState<{ id: string; subject: string; body: string; note?: string } | null>(null);
  const [to, setTo] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  useEffect(() => { api<{ rows: Log[] }>(`/api/seminar-admin/${slug}/records?view=notify`).then(r => { if (r.ok) setLogs(r.data.rows); }); }, [slug]);
  const u = (i: number, patch: Partial<NotifyTemplate>) => set('notify', cfg.notify.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const run = async (id: string, send: boolean) => {
    const r = await api<{ preview: { subject: string; body: string }; note?: string; sent?: boolean }>(`/api/seminar-admin/${slug}/notify`, { method: 'POST', body: JSON.stringify({ id, send, to }) });
    if (r.ok) setPreview({ id, ...r.data.preview, note: r.data.note || (r.data.sent ? '測試信已寄出。' : '') }); else setPreview({ id, subject: '', body: '', note: r.data.error });
  };
  return (
    <>
      <Card title="通知範本" help={`只用 Email 或 LINE，不用簡訊。群發前要擁有者勾選「核准」。${emailEnabled ? '' : '目前環境沒有開啟寄信，所有通知只會記錄、不會寄出。'}LINE 推播需要另外串接 LINE Messaging API，目前只記錄。可用變數：{姓名} {開始時間} {觀看連結} {報名連結} {截止時間} {下一場} {重點清單} {自由筆記}`}>
        <Text label="測試收件 Email（只寄給自己）" type="email" value={to} onChange={setTo} />
        <div className="sa-rows">
          {cfg.notify.map((t, i) => (
            <div className="sa-row is-notify" key={t.id}>
              <div className="sa-row-head"><b>{t.label}</b><span>{t.offsetMinutes === null ? '事件觸發' : t.offsetMinutes < 0 ? `開始前 ${-t.offsetMinutes} 分鐘` : t.offsetMinutes === 0 ? '開始時' : `結束後 ${t.offsetMinutes} 分鐘`}</span></div>
              <div className="sa-inline">
                <Toggle label="啟用" checked={t.enabled} onChange={v => u(i, { enabled: v })} />
                <Toggle label="Email" checked={t.channels.includes('email')} onChange={v => u(i, { channels: v ? [...new Set([...t.channels, 'email' as const])] : t.channels.filter(c => c !== 'email') })} />
                <Toggle label="LINE" checked={t.channels.includes('line')} onChange={v => u(i, { channels: v ? [...new Set([...t.channels, 'line' as const])] : t.channels.filter(c => c !== 'line') })} />
                <Toggle label="核准群發" checked={t.approved} disabled={!canApprove} onChange={v => u(i, { approved: v })} />
              </div>
              {t.offsetMinutes !== null && <Text label="時間（分鐘，負數＝開始前，正數＝結束後）" type="number" value={t.offsetMinutes} onChange={v => u(i, { offsetMinutes: Number(v) || 0 })} />}
              <Text label="主旨" value={t.subject} onChange={v => u(i, { subject: v })} />
              <Text label="內容" area value={t.body} onChange={v => u(i, { body: v })} />
              <div className="sa-inline">
                <button type="button" className="sa-secondary" onClick={() => run(t.id, false)}>預覽</button>
                <button type="button" className="sa-text" onClick={() => run(t.id, true)}>寄測試信給自己</button>
              </div>
              {preview?.id === t.id && <div className="sa-preview">{preview.note && <p className="sa-help">{preview.note}</p>}{preview.subject && <><b>{preview.subject}</b><pre>{preview.body}</pre></>}</div>}
            </div>
          ))}
        </div>
      </Card>
      <Card title="寄送紀錄">
        {logs.length === 0 ? <p className="sa-empty">還沒有紀錄。</p> : <ul className="sa-list">{logs.map(l => <li key={l.id}>{when(l.createdAt)}・{l.template}・{l.channel}・{l.to}・{l.status === 'sent' ? '已寄出' : l.status === 'failed' ? '失敗' : '未寄出（開關未開）'}</li>)}</ul>}
      </Card>
    </>
  );
}

type Member = { id: string; email: string; name: string; role: string; roleLabel: string; active: boolean; createdAt: string };
type Audit = { id: string; createdAt: string; slug: string; who: string; action: string; detail: string };
function MembersScreen() {
  const [list, setList] = useState<Member[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [form, setForm] = useState({ email: '', name: '', role: 'editor', password: '' });
  const [msg, setMsg] = useState('');
  const load = useCallback(async () => {
    const r = await api<{ members: Member[] }>('/api/seminar-admin/members'); if (r.ok) setList(r.data.members);
    const a = await api<{ rows: Audit[] }>('/api/seminar-admin/_all/records?view=audit'); if (a.ok) setAudit(a.data.rows);
  }, []);
  useEffect(() => { load(); }, [load]);
  const add = async (e: FormEvent) => {
    e.preventDefault(); setMsg('');
    const r = await api('/api/seminar-admin/members', { method: 'POST', body: JSON.stringify(form) });
    if (!r.ok) { setMsg(r.data.error || '新增失敗。'); return; }
    setForm({ email: '', name: '', role: 'editor', password: '' }); setMsg('已新增。請自行把密碼交給對方。'); load();
  };
  const patch = async (id: string, body: Record<string, unknown>) => { await api('/api/seminar-admin/members', { method: 'PATCH', body: JSON.stringify({ id, ...body }) }); load(); };
  return (
    <>
      <Card title="成員" help="擁有者：全部，含改價格、開結帳、核准群發、管理成員。管理者：場次、影片、提示、訊息、通知範本編輯，不能改價格或核准群發。小編／客服：審核與回覆提問、看名單（手機與 Email 遮蔽）。檢視者：只看數據。">
        {list.length === 0 ? <p className="sa-empty">還沒有成員。</p> : (
          <ul className="sa-list">{list.map(m => (
            <li key={m.id} className="sa-member">
              <span><b>{m.name || m.email}</b>{m.email}</span>
              <select value={m.role} onChange={e => patch(m.id, { role: e.target.value })} aria-label="角色"><option value="manager">管理者</option><option value="editor">小編／客服</option><option value="viewer">檢視者</option></select>
              <Toggle label="啟用" checked={m.active} onChange={v => patch(m.id, { active: v })} />
            </li>
          ))}</ul>
        )}
        <form className="sa-grid sa-add" onSubmit={add}>
          <Text label="Email" type="email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <Text label="稱呼" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <label className="sa-field"><span>角色</span><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}><option value="manager">管理者</option><option value="editor">小編／客服</option><option value="viewer">檢視者</option></select></label>
          <label className="sa-field"><span>初始密碼（至少 10 個字元）</span><input type="password" autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
          <div><button className="sa-primary">新增成員</button>{msg && <p className="sa-help">{msg}</p>}</div>
        </form>
      </Card>
      <Card title="操作紀錄">
        {audit.length === 0 ? <p className="sa-empty">還沒有紀錄。</p> : <ul className="sa-list">{audit.map(a => <li key={a.id}>{when(a.createdAt)}・{a.who}・{a.slug}・{a.action}{a.detail ? `・${a.detail}` : ''}</li>)}</ul>}
      </Card>
    </>
  );
}
