import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import DashboardView from '../../../components/admin/dashboard-view';
import { loadReport, rangeDays } from '../../../lib/admin/report';
import { isAdminAuthenticated } from '../../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '流量與轉換｜WIN 講師班後台',
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  const params = await searchParams;
  const report = await loadReport(rangeDays(params.range));
  return <DashboardView report={report} />;
}
