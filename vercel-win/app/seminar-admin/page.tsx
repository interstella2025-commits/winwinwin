import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { seminarEnabled } from '@/lib/seminar/flags';
import { CTA_MODES } from '@/lib/seminar/registry';
import AdminClient from './admin-client';
import './admin.css';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '說明會後台', robots: { index: false, follow: false } };

export default function SeminarAdminPage() {
  if (!seminarEnabled()) notFound();
  return <AdminClient modes={CTA_MODES} />;
}
