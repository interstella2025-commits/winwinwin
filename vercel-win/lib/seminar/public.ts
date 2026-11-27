import { checkoutLive, demoAllowed } from './flags';
import { buildState, PHASES } from './clock';
import { loadConfig, CTA_MODES, MODE_COPY } from './registry';
import type { CtaMode, Phase, SeminarConfig } from './types';

/** 給瀏覽器的設定：拿掉通知範本等內部欄位。 */
export function publicConfig(cfg: SeminarConfig) {
  const { notify: _notify, ...rest } = cfg;
  return { ...rest, notes: cfg.notes.filter(n => n.enabled), messages: cfg.messages.filter(m => m.kind !== 'feedback' || m.consent) };
}
export type PublicConfig = ReturnType<typeof publicConfig>;

export type ViewOptions = { demo: boolean; pin: Phase | null; cta: CtaMode | null };

export function viewOptions(search: URLSearchParams | Record<string, string | undefined>): ViewOptions {
  const get = (k: string) => (search instanceof URLSearchParams ? search.get(k) : search[k]) ?? null;
  const demo = get('demo') === '1' && demoAllowed();
  const at = (get('at') || '').toUpperCase();
  const cta = get('cta');
  return {
    demo,
    pin: demo && PHASES.includes(at as Phase) ? at as Phase : null,
    cta: demo && CTA_MODES.some(m => m.id === cta) ? cta as CtaMode : null,
  };
}

/** 讀設定並套用示範參數（只在非正式環境）。 */
export async function resolve(slug: string, v: ViewOptions) {
  const cfg = await loadConfig(slug);
  if (!cfg) return null;
  if (v.cta && v.cta !== cfg.cta.mode) { cfg.cta.mode = v.cta; Object.assign(cfg.cta, MODE_COPY[v.cta]); if (v.cta !== 'form') cfg.cta.target = v.cta === 'card' ? cfg.slug : ''; }
  // 示範預約模式時，沒有設定預約網址就用 Calendly 首頁代替。
  if (v.demo && cfg.cta.mode === 'booking' && !/^https:\/\//.test(cfg.cta.target)) cfg.cta.target = 'https://calendly.com/';
  if (v.demo && cfg.cta.mode === 'form' && /^https:\/\//.test(cfg.cta.target) === false && !cfg.cta.formFields.length) cfg.cta.formFields = [{ id: 'goal', label: '你最想解決的問題', type: 'textarea', required: false }];
  const state = buildState(cfg, new Date(), { demo: v.demo, pin: v.pin, checkoutLive: checkoutLive() && !v.demo });
  return { cfg, state };
}
