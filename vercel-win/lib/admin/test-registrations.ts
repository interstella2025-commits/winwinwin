export const DEFAULT_EXCLUDED_TEST_NAMES = ['elsa測試', 'Elsa', '廖子淇'] as const;

export function normalizeExcludedTestName(name: string) {
  return name.replace(/[\s\u00a0\u3000]+/g, '').toLowerCase();
}

export function excludedTestNameList(env: NodeJS.ProcessEnv = process.env): string[] {
  const extras = (env.ADMIN_EXCLUDED_TEST_NAMES || '')
    .split(/[,，]/)
    .map(name => name.trim())
    .filter(Boolean);
  return [...new Set([...DEFAULT_EXCLUDED_TEST_NAMES, ...extras])];
}

const CONTAINED_TEST_NAME_MARKERS = ['測試', 'elsa', '廖子淇'] as const;

export function isExcludedTestName(name: string | null | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (typeof name !== 'string') return false;
  const needle = normalizeExcludedTestName(name);
  if (!needle) return false;
  if (CONTAINED_TEST_NAME_MARKERS.some(marker => needle.includes(normalizeExcludedTestName(marker)))) return true;
  return excludedTestNameList(env).some(item => normalizeExcludedTestName(item) === needle);
}

export function isExcludedTestSource(source: string | null | undefined): boolean {
  return typeof source === 'string' && source.includes('【測試】');
}

export function isExcludedRegistration(
  name: string | null | undefined,
  sources: Array<string | null | undefined> = [],
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (isExcludedTestName(name, env)) return true;
  return sources.some(source => isExcludedTestSource(source));
}

export type ExcludedTestRow = {
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  session: string;
  result: string;
  orders: { orderNo: string; amount: number; status: string }[];
};

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function excludedTestRegistrationsCsv(rows: ExcludedTestRow[]): string {
  const header = ['時間', '姓名', 'Email', '電話', '場次', '結果', '訂單編號', '金額', '訂單狀態'];
  const lines = [header.map(csvCell).join(',')];
  for (const row of rows) {
    if (!row.orders.length) {
      lines.push([row.createdAt, row.name, row.email, row.phone, row.session, row.result, '', '', ''].map(csvCell).join(','));
      continue;
    }
    for (const order of row.orders) {
      lines.push([row.createdAt, row.name, row.email, row.phone, row.session, row.result, order.orderNo, order.amount, order.status].map(csvCell).join(','));
    }
  }
  return `\uFEFF${lines.join('\n')}\n`;
}
