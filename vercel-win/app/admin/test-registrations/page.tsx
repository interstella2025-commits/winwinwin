import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AdminShell from '../../../components/admin/admin-shell';
import { formatTaipei, loadExcludedTestRegistrations } from '../../../lib/admin/report';
import { isAdminAuthenticated } from '../../../lib/admin/session';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '測試資料｜WIN 講師班後台',
  robots: { index: false, follow: false },
};

export default async function TestRegistrationsPage() {
  if (!(await isAdminAuthenticated())) redirect('/admin');
  const rows = await loadExcludedTestRegistrations();
  return (
    <AdminShell current="tests">
      <main className="admin-page">
        <header className="admin-page-header split">
          <div>
            <p className="admin-eyebrow">BACKUP</p>
            <h1>已排除的測試資料</h1>
            <p>這些報名沒有列入流量頁。姓名含有「測試」、「elsa」或「廖子淇」，來源含有「【測試】」，或屬於另外指定的測試姓名時，會列在這裡。資料仍保留。</p>
          </div>
          <a className="admin-primary-button compact" href="/api/admin/test-registrations">匯出 CSV</a>
        </header>
        <section className="admin-panel">
          {rows.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>時間</th><th>姓名</th><th>聯絡</th><th>場次</th><th>結果</th><th>訂單</th></tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={`${row.createdAt}-${row.email}-${row.name}`}>
                      <td data-label="時間">{formatTaipei(row.createdAt)}</td>
                      <td data-label="姓名">{row.name}</td>
                      <td data-label="聯絡">{row.email}<span>{row.phone}</span></td>
                      <td data-label="場次">{row.session}</td>
                      <td data-label="結果">{row.result}</td>
                      <td data-label="訂單">{row.orders.length ? row.orders.map(order => `${order.orderNo}（${order.status} ${order.amount}）`).join('、') : '無'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="analytics-inline-empty">目前沒有符合測試姓名的報名。</p>}
        </section>
      </main>
    </AdminShell>
  );
}
