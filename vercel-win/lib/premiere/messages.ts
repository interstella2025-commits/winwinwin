export const MESSAGE_KINDS = [
  { id: 'announcement', label: '老師公告' },
  { id: 'feedback', label: '學員回饋' },
  { id: 'note', label: '一般留言' },
] as const;

export type MessageKind = (typeof MESSAGE_KINDS)[number]['id'];

export type PremiereMessage = {
  id: string;
  displayName: string;
  avatarUrl: string;
  body: string;
  appearSeconds: number;
  kind: MessageKind;
};

export function kindLabel(kind: string) {
  return MESSAGE_KINDS.find(item => item.id === kind)?.label || '一般留言';
}

export function parseTimestamp(value: string) {
  const match = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  if (seconds > 24 * 3600) return null;
  return seconds;
}

export function formatTimestamp(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return [hours, minutes, rest].map(value => String(value).padStart(2, '0')).join(':');
}

export function visibleMessages(messages: PremiereMessage[], positionSeconds: number) {
  const at = Number.isFinite(positionSeconds) ? positionSeconds : 0;
  return messages
    .filter(message => message.appearSeconds <= at)
    .sort((a, b) => a.appearSeconds - b.appearSeconds || a.id.localeCompare(b.id));
}

export function normalizeMessages(value: unknown): PremiereMessage[] {
  if (!Array.isArray(value)) return [];
  const messages: PremiereMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const displayName = typeof row.displayName === 'string' ? row.displayName.trim() : '';
    const body = typeof row.body === 'string' ? row.body.trim() : '';
    const kind = MESSAGE_KINDS.some(entry => entry.id === row.kind) ? row.kind as MessageKind : null;
    const appearSeconds = typeof row.appearSeconds === 'number' && Number.isInteger(row.appearSeconds) ? row.appearSeconds : null;
    if (!displayName || !body || !kind || appearSeconds == null || appearSeconds < 0) continue;
    messages.push({
      id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
      displayName,
      avatarUrl: typeof row.avatarUrl === 'string' ? row.avatarUrl : '',
      body,
      appearSeconds,
      kind,
    });
  }
  return messages;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export function messagesToCsv(messages: PremiereMessage[]) {
  const lines = [['顯示名稱', '類型', '出現時間', '內容', '頭像'], ...messages.map(message => [message.displayName, kindLabel(message.kind), formatTimestamp(message.appearSeconds), message.body, message.avatarUrl])];
  return lines.map(line => line.map(csvCell).join(',')).join('\r\n');
}

export function messagesFromCsv(text: string): PremiereMessage[] {
  const rows = parseCsv(text).slice(1);
  return rows.flatMap(row => {
    const [displayName = '', kindLabelText = '', appear = '', body = '', avatarUrl = ''] = row;
    const kind = MESSAGE_KINDS.find(item => item.label === kindLabelText.trim() || item.id === kindLabelText.trim())?.id;
    const appearSeconds = parseTimestamp(appear);
    if (!displayName.trim() || !body.trim() || !kind || appearSeconds == null) return [];
    return [{ id: crypto.randomUUID(), displayName: displayName.trim(), avatarUrl: avatarUrl.trim(), body: body.trim(), appearSeconds, kind }];
  });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const source = text.replace(/^\uFEFF/, '');
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index += 1; continue; }
      if (char === '"') { quoted = false; continue; }
      cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === ',') { row.push(cell); cell = ''; continue; }
    if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (char !== '\r') cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(item => item.some(value => value.trim()));
}
