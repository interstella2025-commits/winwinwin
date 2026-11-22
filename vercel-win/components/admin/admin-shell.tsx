export default function AdminShell({ children }: { children: React.ReactNode; current?: 'traffic' | 'tests' }) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand-mark small">W</div>
          <p className="admin-eyebrow">WIN 講師班</p>
          <strong className="admin-sidebar-title">流量後台</strong>
        </div>
        <form method="post" action="/api/admin/logout">
          <button className="admin-ghost-button" type="submit">登出</button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
