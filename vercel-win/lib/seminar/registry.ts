import { store } from './store';
import { templateSeminar } from './projects/template';
import { winLecturerSeminar } from './projects/win-lecturer';
import type { CtaMode, SeminarConfig } from './types';

/** 寫在程式裡的設定。新增專案：在 projects/ 加一個檔案，再登記在這裡。 */
export const BUILTIN: Record<string, SeminarConfig> = {
  [templateSeminar.slug]: templateSeminar,
  [winLecturerSeminar.slug]: winLecturerSeminar,
};

export const CTA_MODES: Array<{ id: CtaMode; label: string }> = [
  { id: 'card', label: '刷卡' },
  { id: 'form', label: '填表' },
  { id: 'booking', label: '預約' },
  { id: 'lead', label: '留名單' },
];

/** 切換 CTA 模式時的預設按鈕文字（後台可再改）。 */
export const MODE_COPY: Record<CtaMode, { buttonLabel: string; floatingLabel: string; submitLabel: string; successTitle: string; successBody: string; terms: string }> = {
  card: { buttonLabel: '我要報名', floatingLabel: '說明會限定方案', submitLabel: '前往結帳', successTitle: '正在前往付款頁面', successBody: '付款完成後，上課資訊會用 Email 和 LINE 通知你。', terms: '送出即表示同意提供姓名、手機與 Email，供這次報名與付款使用。' },
  form: { buttonLabel: '填寫報名表', floatingLabel: '填寫報名表', submitLabel: '送出報名', successTitle: '報名資料已送出。', successBody: '我們會在兩個工作天內用 Email 或 LINE 與你聯繫。', terms: '送出即表示同意我們用 Email 或 LINE 與你聯繫報名事宜。' },
  booking: { buttonLabel: '預約諮詢', floatingLabel: '預約一對一諮詢', submitLabel: '選擇時段', successTitle: '已開啟預約頁面', successBody: '預約完成後，確認信會寄到你的信箱。', terms: '' },
  lead: { buttonLabel: '留下聯絡方式', floatingLabel: '想了解更多', submitLabel: '送出', successTitle: '收到了，謝謝你。', successBody: '我們會用 Email 或 LINE 與你聯繫。', terms: '送出即表示同意我們用 Email 或 LINE 與你聯繫。' },
};

export function validSlug(slug: string) { return /^[a-z0-9][a-z0-9-]{1,48}$/.test(slug); }

/** 後台存的設定優先，沒有就用程式裡的。 */
export async function loadConfig(slug: string): Promise<SeminarConfig | null> {
  if (!validSlug(slug)) return null;
  try {
    const saved = await store().getConfig(slug);
    if (saved) return mergeConfig(BUILTIN[slug] ?? BUILTIN.template, saved);
  } catch { /* 資料庫還沒建表時退回程式設定 */ }
  return BUILTIN[slug] ? structuredClone(BUILTIN[slug]) : null;
}

export async function listConfigs(): Promise<Array<{ slug: string; name: string; kind: SeminarConfig['kind']; custom: boolean }>> {
  let saved: string[] = [];
  try { saved = await store().listConfigSlugs(); } catch { saved = []; }
  const slugs = [...new Set([...Object.keys(BUILTIN), ...saved])];
  const out = [];
  for (const slug of slugs) {
    const c = await loadConfig(slug);
    if (c) out.push({ slug, name: c.brand.name, kind: c.kind, custom: !BUILTIN[slug] });
  }
  return out;
}

/** 舊的存檔缺新欄位時，用基底補齊。 */
export function mergeConfig(base: SeminarConfig, saved: Partial<SeminarConfig>): SeminarConfig {
  const out = structuredClone(base) as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(saved)) {
    const cur = out[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' && !Array.isArray(cur)) out[k] = { ...(cur as object), ...(v as object) };
    else if (v !== undefined) out[k] = v;
  }
  return out as unknown as SeminarConfig;
}

/** 文字裡不能出現給內部看的占位標記，避免公開。 */
export function publicCopyProblems(c: SeminarConfig): string[] {
  const text = JSON.stringify({ copy: c.copy, speaker: c.speaker, cta: c.cta, highlights: c.highlights, faqs: c.faqs, notes: c.notes, messages: c.messages });
  const problems: string[] = [];
  for (const bad of ['待 Elsa', '待確認', '待提供', '待決定', 'TODO', '直播', '首播']) if (text.includes(bad)) problems.push(`文字含有「${bad}」`);
  if (/退費|退款/.test(text)) problems.push('文字含有退費字樣');
  if (c.messages.some(m => m.kind === 'feedback' && !m.consent)) problems.push('有「學員回饋」沒有勾選已取得本人同意');
  return problems;
}
