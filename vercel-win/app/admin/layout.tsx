import type { Metadata } from 'next';
import './admin.css';

export const metadata: Metadata = {
  title: 'WIN 講師班後台',
  description: 'WIN 講師班流量與轉換後台',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="win-admin-root">{children}</div>;
}
