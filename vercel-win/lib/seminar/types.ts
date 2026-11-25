/**
 * 說明會模板：一份引擎，每個專案／場次一份設定。
 * 設定可以寫在 lib/seminar/projects/*.ts，也可以在後台覆寫（存進資料庫或預覽記憶體）。
 */
export type CtaMode = 'card' | 'form' | 'booking' | 'lead';
export type VideoProvider = 'hls' | 'mp4' | 'vimeo' | 'youtube';
export type MessageKind = 'announcement' | 'faq' | 'note' | 'feedback';

export type SeminarNote = { id: string; at: number; chapter: string; text: string; holdSeconds: number; preset: boolean; enabled: boolean };
export type SeminarMessage = { id: string; at: number; kind: MessageKind; name: string; body: string; avatar?: string; consent?: boolean; pinned?: boolean };
export type SeminarChapter = { at: number; title: string };
export type SeminarFaq = { q: string; a: string };
export type FormField = { id: string; label: string; type: 'text' | 'email' | 'tel' | 'textarea' | 'select'; required: boolean; options?: string[] };

export type NotifyTemplate = {
  id: 'reserved' | 'before24h' | 'before1h' | 'started' | 'notes' | 'offer' | 'offerEnding' | 'noShow' | 'paid';
  label: string;
  channels: Array<'email' | 'line'>;
  enabled: boolean;
  /** 相對時間（分鐘）。負數＝開始前；正數＝結束後。null＝事件觸發。 */
  offsetMinutes: number | null;
  subject: string;
  body: string;
  /** 群發前要擁有者核准。 */
  approved: boolean;
};

export type SeminarConfig = {
  slug: string;
  /** 範本（template）或實際專案（project）。範本不會出現在正式場次清單。 */
  kind: 'template' | 'project';
  brand: { name: string; mark: string };
  theme: { bg: string; surface: string; ink: string; muted: string; accent: string; line: string; onAccent: string };
  copy: {
    eyebrow: string;
    titleLines: string[];
    subtitle: string;
    hook: string;
    endedTitle: string;
    endedBody: string;
    offerClosedTitle: string;
    offerClosedBody: string;
  };
  speaker: { name: string; title: string; avatar: string };
  cover: string;
  highlights: Array<{ title: string; body: string }>;
  audience: string[];
  schedule: {
    sessionCode: string;
    startAt: string;
    durationSeconds: number;
    soonMinutes: number;
    /** 影片第幾秒出現 CTA。 */
    offerAtSeconds: number;
    /** 優惠截止（ISO）。空字串＝說明會結束當下截止。 */
    offerDeadline: string;
    nextSession: { label: string; url: string } | null;
  };
  video: { provider: VideoProvider; id: string; hash: string; url: string; sample: boolean; chapters: SeminarChapter[] };
  notes: SeminarNote[];
  messages: SeminarMessage[];
  /** 預排訊息要不要標「預先準備」。 */
  labelScripted: boolean;
  faqs: SeminarFaq[];
  questions: { enabled: boolean; moderated: boolean; placeholder: string };
  cta: {
    mode: CtaMode;
    productName: string;
    productLine: string;
    description: string;
    priceTwd: number;
    originalPriceTwd: number;
    seatsText: string;
    buttonLabel: string;
    floatingLabel: string;
    submitLabel: string;
    terms: string;
    /** form：外部表單網址（空白＝使用內建表單）；booking：預約網址；card：方案代碼。 */
    target: string;
    formFields: FormField[];
    successTitle: string;
    successBody: string;
    fallback: { label: string; url: string } | null;
  };
  contact: { lineUrl: string; lineLabel: string; email: string };
  tracking: { metaPixelId: string };
  notify: NotifyTemplate[];
};

export type Phase = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5';

export type SeminarState = {
  slug: string;
  serverNow: string;
  startAt: string;
  endsAt: string;
  offerAt: string;
  offerDeadline: string;
  soonAt: string;
  durationSeconds: number;
  phase: Phase;
  positionSeconds: number;
  demo: boolean;
  /** 預覽時把影片內的時間點（筆記、訊息、CTA）等比縮放。 */
  timeScale: number;
  checkoutLive: boolean;
};
