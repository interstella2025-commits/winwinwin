import { formatDuration, formatTaipei, type DashboardReport, type FunnelStep } from '../../lib/admin/report';

function money(amount: number) {
  return `NT$${amount.toLocaleString('zh-TW')}`;
}

function Funnel({ title, note, steps }: { title: string; note: string; steps: FunnelStep[] }) {
  const top = Math.max(steps[0]?.count || 0, 1);
  return (
    <section className="win-admin-card" aria-labelledby={title}>
      <h2 id={title}>{title}</h2>
      <p className="win-admin-lead">{note}</p>
      <ul className="win-admin-funnel">
        {steps.map((step, index) => {
          const previous = index === 0 ? step.count : steps[index - 1].count;
          const rate = previous ? Math.round((step.count / previous) * 100) : 0;
          const width = step.count ? Math.max(6, Math.round((step.count / top) * 100)) : 0;
          return (
            <li key={step.label}>
              <div className="win-admin-funnel-row">
                <span>{step.label}</span>
                <strong>{step.count}</strong>
              </div>
              <div className="win-admin-bar" aria-hidden="true"><span style={{ width: `${width}%` }} /></div>
              <p className={index > 0 && rate < 50 ? 'win-admin-rate is-accent' : 'win-admin-rate'}>
                {index === 0 ? (step.basis === 'records' ? '資料庫筆數' : '工作階段') : `較上一步 ${rate}%`}
              </p>
              {step.detail ? <p className="win-admin-detail">{step.detail}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function DashboardView({ report }: { report: DashboardReport }) {
  const maxSource = Math.max(...report.sources.map(source => source.sessions), 1);
  const maxDwell = Math.max(...report.dwellBuckets.map(bucket => bucket.count), 1);
  return (
    <main className="win-admin-page">
      <header className="win-admin-bar">
        <div>
          <p className="win-admin-kicker">WIN 講師班</p>
          <h1>流量與轉換</h1>
        </div>
        <div className="win-admin-bar-actions">
          <nav className="win-admin-ranges" aria-label="統計區間">
            {([1, 7, 30] as const).map(days => (
              <a key={days} className={report.days === days ? 'win-admin-chip is-on' : 'win-admin-chip'} href={`/admin/dashboard?range=${days}`}>
                {days === 1 ? '24 小時' : `${days} 日`}
              </a>
            ))}
          </nav>
          <form method="post" action="/api/admin/logout">
            <button className="win-admin-text-button" type="submit">登出</button>
          </form>
        </div>
      </header>

      {report.fixture ? <p className="win-admin-banner" role="status">此畫面是本機示範資料，用來預覽版面。正式環境不會使用這批數字。</p> : null}
      {report.analyticsUnavailable ? <p className="win-admin-banner" role="status">流量表尚未建立或資料庫未連線。請先套用 migration 0003_site_analytics.sql。報名與付款仍會盡量從既有資料讀取。</p> : null}
      {report.registrationsUnavailable ? <p className="win-admin-banner" role="status">目前讀不到報名與付款資料。</p> : null}

      <section className="win-admin-kpis" aria-label="摘要">
        <article className="win-admin-card">
          <h2>造訪</h2>
          <p className="win-admin-number">{report.kpis.sessions}</p>
          <p className="win-admin-kpi-note">{report.kpis.visitors} 位訪客 · 平均捲動 {report.kpis.averageScroll}%</p>
        </article>
        <article className="win-admin-card">
          <h2>平均停留</h2>
          <p className="win-admin-number">{formatDuration(report.kpis.averageDwellSeconds)}</p>
          <p className="win-admin-kpi-note">中位數 {formatDuration(report.kpis.medianDwellSeconds)}</p>
        </article>
        <article className="win-admin-card">
          <h2>線上<span className="win-admin-accent">免費</span>登記</h2>
          <p className="win-admin-number">{report.kpis.freeOnline}</p>
          <p className="win-admin-kpi-note">未完成付款 {report.kpis.onlineAbandoned} · 既有已付款 {report.kpis.onlinePaid}</p>
        </article>
        <article className="win-admin-card">
          <h2>實體已付款</h2>
          <p className="win-admin-number">{report.kpis.inpersonPaid}</p>
          <p className="win-admin-kpi-note"><span className="win-admin-accent">NT$399</span> 合計 {money(report.kpis.inpersonPaidAmount)} · 12/16 {report.kpis.inpersonPaid1216}</p>
        </article>
      </section>

      <p className="win-admin-explain">線上沒有付款訂單，才算免費登記。目前正式站仍會為線上建立 NT$399 訂單，那些人會計入「未完成付款」或「既有已付款」。實體課以已付款、金額 399、且不是 NT$1 測試單計算。其他場次通知 {report.kpis.notify} 筆，測試單 {report.kpis.excludedTestOrders} 筆，都不計入上面兩個結果。</p>

      <div className="win-admin-split">
        <Funnel title="線上免費" note="進站與點擊是全站工作階段。從開始填表起才只算線上。" steps={report.funnels.online} />
        <Funnel title="實體課付款" note="前往付款與付款完成以訂單為準。12/16 與其他實體場次都算在內，12/16 另記在摘要。" steps={report.funnels.inperson} />
      </div>

      <section className="win-admin-card" aria-labelledby="sources-title">
        <h2 id="sources-title">流量來源</h2>
        <p className="win-admin-lead">有 UTM 時用來源與媒介，否則用來路網域。已付款不回寫到舊訂單，所以來源表停在前往付款。</p>
        {report.sources.length ? (
          <div className="win-admin-table-wrap">
            <table className="win-admin-table">
              <thead>
                <tr>
                  <th>來源</th>
                  <th>造訪</th>
                  <th>平均停留</th>
                  <th>點擊報名</th>
                  <th>開始填表</th>
                  <th>送出</th>
                  <th>前往付款</th>
                </tr>
              </thead>
              <tbody>
                {report.sources.map(source => (
                  <tr key={`${source.label}-${source.campaign || ''}`}>
                    <td data-label="來源">
                      <strong>{source.label}</strong>
                      {source.campaign ? <span className="win-admin-sub">{source.campaign}</span> : null}
                      <span className="win-admin-mini-bar" aria-hidden="true"><i style={{ width: `${Math.round((source.sessions / maxSource) * 100)}%` }} /></span>
                    </td>
                    <td data-label="造訪">{source.sessions}</td>
                    <td data-label="平均停留">{formatDuration(source.averageDwellSeconds)}</td>
                    <td data-label="點擊報名">{source.cta}</td>
                    <td data-label="開始填表">{source.formStart}</td>
                    <td data-label="送出">{source.submit}</td>
                    <td data-label="前往付款">{source.paymentStart}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="win-admin-empty">這段時間還沒有進站紀錄。</p>}
      </section>

      <div className="win-admin-split">
        <section className="win-admin-card" aria-labelledby="dwell-title">
          <h2 id="dwell-title">停留時間</h2>
          <ul className="win-admin-meters">
            {report.dwellBuckets.map(bucket => (
              <li key={bucket.label}>
                <span>{bucket.label}</span>
                <span className="win-admin-meter" aria-hidden="true"><i style={{ width: `${Math.round((bucket.count / maxDwell) * 100)}%` }} /></span>
                <strong>{bucket.count}</strong>
              </li>
            ))}
          </ul>
        </section>
        <section className="win-admin-card" aria-labelledby="device-title">
          <h2 id="device-title">裝置</h2>
          {report.devices.length ? (
            <ul className="win-admin-meters">
              {report.devices.map(device => (
                <li key={device.key}>
                  <span>{device.label}</span>
                  <span className="win-admin-meter" aria-hidden="true"><i style={{ width: `${report.kpis.sessions ? Math.round((device.count / report.kpis.sessions) * 100) : 0}%` }} /></span>
                  <strong>{device.count}</strong>
                </li>
              ))}
            </ul>
          ) : <p className="win-admin-empty">還沒有裝置資料。</p>}
        </section>
      </div>

      <section className="win-admin-card" aria-labelledby="registrations-title">
        <h2 id="registrations-title">近期報名</h2>
        {report.registrations.length ? (
          <div className="win-admin-table-wrap">
            <table className="win-admin-table">
              <thead>
                <tr><th>時間</th><th>結果</th><th>姓名</th><th>聯絡</th><th>場次</th></tr>
              </thead>
              <tbody>
                {report.registrations.map(row => (
                  <tr key={`${row.createdAt}-${row.email}-${row.result}`}>
                    <td data-label="時間">{formatTaipei(row.createdAt)}</td>
                    <td data-label="結果">{row.result === '免費登記' ? <span className="win-admin-accent">{row.result}</span> : row.result}</td>
                    <td data-label="姓名">{row.name}</td>
                    <td data-label="聯絡">{row.email}<span className="win-admin-sub">{row.phone}</span></td>
                    <td data-label="場次">{row.session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="win-admin-empty">這段時間還沒有報名。</p>}
      </section>

      <section className="win-admin-card" aria-labelledby="payments-title">
        <h2 id="payments-title">近期付款</h2>
        <p className="win-admin-lead">線上既有 NT$399 與實體訂單都列在這裡。NT$1 測試單不列入。</p>
        {report.payments.length ? (
          <div className="win-admin-table-wrap">
            <table className="win-admin-table">
              <thead>
                <tr><th>時間</th><th>狀態</th><th>金額</th><th>訂單</th><th>姓名</th><th>場次</th></tr>
              </thead>
              <tbody>
                {report.payments.map(row => (
                  <tr key={row.orderNo}>
                    <td data-label="時間">{formatTaipei(row.at)}</td>
                    <td data-label="狀態">{row.status}</td>
                    <td data-label="金額">{money(row.amount)}</td>
                    <td data-label="訂單">{row.orderNo}</td>
                    <td data-label="姓名">{row.name}</td>
                    <td data-label="場次">{row.session}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="win-admin-empty">這段時間還沒有付款訂單。</p>}
      </section>
    </main>
  );
}
