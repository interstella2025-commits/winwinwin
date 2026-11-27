import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { seminarEnabled } from '@/lib/seminar/flags';
import { CTA_MODES, loadConfig } from '@/lib/seminar/registry';
import { publicConfig, resolve, viewOptions } from '@/lib/seminar/public';
import { Noto_Serif_TC } from 'next/font/google';
import SeminarClient from './seminar-client';
import '../seminar.css';

export const dynamic = 'force-dynamic';

const serif = Noto_Serif_TC({ weight: ['600'], subsets: ['latin'], display: 'swap', variable: '--sm-serif', preload: false });

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
const flat = (sp: Record<string, string | string[] | undefined>) => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!seminarEnabled()) return { robots: { index: false } };
  const { slug } = await params;
  const cfg = await loadConfig(slug);
  if (!cfg) return { robots: { index: false } };
  return { title: `${cfg.copy.titleLines.join(' ')}｜${cfg.brand.name}`, description: cfg.copy.subtitle, robots: { index: false, follow: false } };
}

export default async function SeminarPage({ params, searchParams }: Props) {
  if (!seminarEnabled()) notFound();
  const { slug } = await params;
  const sp = flat(await searchParams);
  const view = viewOptions(sp);
  const r = await resolve(slug, view);
  if (!r) notFound();
  const order = typeof sp.order === 'string' && /^[a-f0-9]{16,64}$/.test(sp.order) ? sp.order : null;
  return <div className={serif.variable}><SeminarClient config={publicConfig(r.cfg)} initial={r.state} view={view} order={order} modes={CTA_MODES} /></div>;
}
