'use client';
import { useEffect, useMemo, useState } from 'react';
import { MESSAGE_KINDS, formatTimestamp, kindLabel, messagesFromCsv, messagesToCsv, parseTimestamp, visibleMessages, type MessageKind, type PremiereMessage } from '@/lib/premiere/messages';

type Draft = {
  id: string;
  displayName: string;
  avatarUrl: string;
  body: string;
  appear: string;
  kind: MessageKind;
};

const TOKEN_KEY = 'win-premiere-messages-token';

function blank(): Draft {
  return { id: crypto.randomUUID(), displayName: '', avatarUrl: '', body: '', appear: '00:00:00', kind: 'note' };
}

function fromMessage(message: PremiereMessage): Draft {
  return {
    id: message.id,
    displayName: message.displayName,
    avatarUrl: message.avatarUrl || '',
    body: message.body,
    appear: formatTimestamp(message.appearSeconds),
    kind: message.kind,
  };
}

export default function Editor() {
  const [token, setToken] = useState('');
  const [rows, setRows] = useState<Draft[]>([]);
  const [previewAt, setPreviewAt] = useState('00:00:00');
  const [status, setStatus] = useState('這一頁出廠是空的，不會自帶訊息。');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY) || '';
    setToken(saved);
    void load();
  }, []);

  async function load() {
    setBusy(true);
    try {
      const response = await fetch('/api/premiere/messages', { cache: 'no-store' });
      if (!response.ok) throw new Error('讀不到訊息。後端的訊息表可能還沒發布。');
      const body = await response.json() as { messages?: unknown };
      const list = Array.isArray(body.messages) ? body.messages as PremiereMessage[] : [];
      setRows(list.filter(item => item && item.displayName && item.body).map(fromMessage));
      setStatus(list.length ? `已讀取 ${list.length} 則。` : '目前沒有訊息。');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '讀取失敗。');
    } finally {
      setBusy(false);
    }
  }

  function toPayload() {
    const messages: PremiereMessage[] = [];
    for (const [index, row] of rows.entries()) {
      const appearSeconds = parseTimestamp(row.appear);
      if (!row.displayName.trim() || row.displayName.trim().length > 40 || !row.body.trim() || row.body.trim().length > 400 || appearSeconds == null) {
        setStatus(`第 ${index + 1} 則還沒填好。名字 40 字以內、內容 400 字以內，時間寫成 00:00:00。`);
        return null;
      }
      messages.push({
        id: row.id,
        displayName: row.displayName.trim(),
        avatarUrl: row.avatarUrl.trim(),
        body: row.body.trim(),
        appearSeconds,
        kind: row.kind,
      });
    }
    return messages;
  }

  async function save() {
    if (!token.trim()) {
      setStatus('請先貼上匯出名單用的同一組通行碼。');
      return;
    }
    const messages = toPayload();
    if (!messages) return;
    sessionStorage.setItem(TOKEN_KEY, token.trim());
    setBusy(true);
    try {
      const response = await fetch('/api/premiere/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token.trim()}` },
        body: JSON.stringify({ messages }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; count?: number };
      if (!response.ok) throw new Error(body.error || (response.status === 404 ? '通行碼不對，或後端尚未發布。' : '儲存失敗。'));
      setStatus(`已儲存 ${body.count ?? messages.length} 則。重新整理首播頁就會看到。`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : '儲存失敗。');
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const messages = toPayload();
    if (!messages) return;
    const blob = new Blob([messagesToCsv(messages)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'premiere-messages.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importCsv(file: File) {
    const messages = messagesFromCsv(await file.text());
    setRows(messages.map(fromMessage));
    setStatus(messages.length ? `已從檔案讀入 ${messages.length} 則，還沒儲存。` : '檔案裡沒有可用的訊息。');
  }

  function update(id: string, patch: Partial<Draft>) {
    setRows(current => current.map(row => row.id === id ? { ...row, ...patch } : row));
  }

  const previewSeconds = parseTimestamp(previewAt);
  const preview = useMemo(() => {
    if (previewSeconds == null) return [];
    const messages = rows.flatMap(row => {
      const appearSeconds = parseTimestamp(row.appear);
      if (!row.displayName.trim() || !row.body.trim() || appearSeconds == null) return [];
      return [{ id: row.id, displayName: row.displayName.trim(), avatarUrl: row.avatarUrl.trim(), body: row.body.trim(), appearSeconds, kind: row.kind }];
    });
    return visibleMessages(messages, previewSeconds);
  }, [rows, previewSeconds]);

  return <main className="studio">
    <div className="studio-wrap">
      <div className="studio-top">
        <div>
          <p className="studio-kicker">定時播映</p>
          <h1>即時訊息設定</h1>
        </div>
        <a className="studio-back" href="/premiere">回到首播頁</a>
      </div>
      <p className="studio-lead">訊息會跟著影片時間出現。晚到或重新整理的人，會看到已經到點的全部訊息。類型可以是老師公告、學員回饋或一般留言。這裡沒有觀眾人數，也沒有留言輸入框。儲存會整份取代舊後端的清單。通行碼和匯出名單是同一組，只留在這台瀏覽器。</p>
      <label className="studio-token">通行碼
        <input type="password" autoComplete="off" value={token} onChange={event => setToken(event.target.value)} />
      </label>
      <div className="studio-actions">
        <button type="button" onClick={() => void load()} disabled={busy}>重新讀取</button>
        <button type="button" onClick={() => void save()} disabled={busy}>儲存到後端</button>
        <button type="button" className="quiet" onClick={exportCsv}>匯出 CSV</button>
        <label className="studio-file">匯入 CSV
          <input type="file" accept=".csv,text/csv" onChange={event => { const file = event.target.files?.[0]; if (file) void importCsv(file); event.target.value = ''; }} />
        </label>
        <button type="button" className="quiet" onClick={() => setRows(current => [...current, blank()])}>新增一則</button>
      </div>
      <p className="studio-status" role="status">{status}</p>
      <div className="studio-grid">
        {rows.length === 0 ? <p className="studio-empty">還沒有訊息。按「新增一則」，或匯入 CSV。</p> : <ol className="studio-list">
          {rows.map((row, index) => <li key={row.id}>
            <div className="studio-row">
              <label>顯示名稱
                <input value={row.displayName} maxLength={40} onChange={event => update(row.id, { displayName: event.target.value })} />
              </label>
              <label>類型
                <select value={row.kind} onChange={event => update(row.id, { kind: event.target.value as MessageKind })}>
                  {MESSAGE_KINDS.map(kind => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
                </select>
              </label>
              <label>出現時間
                <input value={row.appear} inputMode="numeric" placeholder="00:00:00" onChange={event => update(row.id, { appear: event.target.value })} />
              </label>
            </div>
            <label>內容
              <textarea value={row.body} maxLength={400} onChange={event => update(row.id, { body: event.target.value })} />
            </label>
            <label>頭像網址，可留空
              <input value={row.avatarUrl} placeholder="https://" onChange={event => update(row.id, { avatarUrl: event.target.value })} />
            </label>
            <button type="button" className="studio-delete" onClick={() => setRows(current => current.filter(item => item.id !== row.id))}>刪除第 {index + 1} 則</button>
          </li>)}
        </ol>}
        <aside className="studio-preview">
          <h2>預覽</h2>
          <div className="studio-preview-tools">
            <label>看到這個時間
              <input value={previewAt} placeholder="00:00:00" onChange={event => setPreviewAt(event.target.value)} />
            </label>
          </div>
          <div className="feed">
            {previewSeconds == null ? <p className="feed-empty">時間請寫成 00:00:00。</p> : preview.length === 0 ? <p className="feed-empty">這個時間還沒有訊息。</p> : <ol>
              {preview.map(message => <li key={message.id} className={`msg msg--${message.kind}`}>
                <span className="avatar" aria-hidden="true">{message.displayName.slice(0, 1)}</span>
                <span>
                  <strong>{message.displayName}</strong>
                  <em>{kindLabel(message.kind)}</em>
                  <p>{message.body}</p>
                </span>
                <time>{formatTimestamp(message.appearSeconds)}</time>
              </li>)}
            </ol>}
          </div>
        </aside>
      </div>
    </div>
  </main>;
}
