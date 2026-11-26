import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminShell from '../../../components/admin/admin-shell';
import Us3Dashboard from '../../../components/admin/us3-dashboard';
import { isAdminAuthenticated } from '../../../lib/admin/session';
import { loadUs3Report, us3RangeDays } from '../../../lib/admin/us3';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '流量與報名｜美國三校',
  robots: { index: false, follow: false },
};

export default async function Us3AdminPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  const params = await searchParams;
  const report = await loadUs3Report(us3RangeDays(params.range));
  return (
    <AdminShell current="traffic" project="us3">
      <Us3Dashboard report={report} />
    </AdminShell>
  );
}
