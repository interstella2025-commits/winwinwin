import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { premierePageEnabled } from '@/lib/premiere/state';
import Editor from './editor';
import '../premiere.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '即時訊息設定｜WIN',
  robots: { index: false, follow: false },
};

export default function PremiereMessagesPage() {
  if (!premierePageEnabled()) notFound();
  return <Editor />;
}
