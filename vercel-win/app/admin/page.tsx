import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import LoginForm from '../../components/admin/login-form';
import { isAdminAuthenticated } from '../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '登入｜WIN 講師班後台',
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) redirect('/admin/dashboard');
  return <LoginForm />;
}
