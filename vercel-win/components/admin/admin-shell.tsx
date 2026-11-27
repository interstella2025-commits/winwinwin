export default function AdminShell({ children, current, project = 'lecturer' }: {
  children: React.ReactNode;
  current: 'traffic' | 'tests';
  project?: 'lecturer' | 'us3';
}) {
  return (
    <div className="admin-app">
      <aside className="admin-sidebar">
        <div>
          <div className="admin-brand-mark small">W</div>
          <p className="admin-eyebrow">WIN專案</p>
          <strong className="admin-sidebar-title">{project === 'us3' ? '美國三校' : '講師班'}</strong>
          <div className="admin-project-switch" role="navigation" aria-label="專案">
            <a className={project === 'lecturer' ? 'active' : ''} href="/admin/dashboard" aria-current={project === 'lecturer' ? 'page' : undefined}>講師班</a>
            <a className={project === 'us3' ? 'active' : ''} href="/admin/us3" aria-current={project === 'us3' ? 'page' : undefined}>美國三校</a>
          </div>
        </div>
        <nav>
          {project === 'us3' ? (
            <>
              <a href="/admin/dashboard">講師班</a>
              <a className="active" href="/admin/us3" aria-current="page">美國三校</a>
            </>
          ) : (
            <>
              <a className={current === 'traffic' ? 'active' : ''} href="/admin/dashboard" aria-current={current === 'traffic' ? 'page' : undefined}>流量</a>
              {current === 'tests' ? <a className="active" href="/admin/test-registrations" aria-current="page">測試資料</a> : null}
            </>
          )}
        </nav>
        <form method="post" action="/api/admin/logout">
          <button className="admin-ghost-button" type="submit">登出</button>
        </form>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
