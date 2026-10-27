import type { Metadata } from 'next';
import { PREMIERE } from '@/lib/premiere/config';
import { getPremiereState } from '@/lib/premiere/state';
import Player from './player';
import './premiere.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `${PREMIERE.copy.title}｜WIN`,
  description: PREMIERE.copy.lead,
  robots: { index: false, follow: false },
};

export default function PremierePage() {
  return <Player initial={getPremiereState(new Date())} />;
}
