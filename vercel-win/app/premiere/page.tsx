import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PREMIERE } from '@/lib/premiere/config';
import { getPremiereState, premiereDemoRequested, premierePageEnabled } from '@/lib/premiere/state';
import Player from './player';
import './premiere.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${PREMIERE.copy.title}｜WIN`,
  description: PREMIERE.copy.lead,
  robots: { index: false, follow: false },
};

export default async function PremierePage(props: { searchParams?: Promise<{ demo?: string }> } = {}) {
  if (!premierePageEnabled()) notFound();
  const params = props.searchParams ? await props.searchParams : {};
  const demo = premiereDemoRequested(params.demo);
  return <Player initial={getPremiereState(new Date(), process.env, { demo })} />;
}
