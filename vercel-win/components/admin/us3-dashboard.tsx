import { formatTaipei } from '../../lib/admin/report';
import type { Us3Report } from '../../lib/admin/us3';
import { HorizontalBreakdown, JourneyPathVisual, TrafficTrendChart, journeyFromCounts } from './analytics-visuals';

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

export default function Us3Dashboard({ report }: { report: Us3Report }) {
  const rangeLabel = report.days === 1 ? '最近 24 小時' : `最近 ${report.days} 天`;
  const top = report.kpis.visits;
  return (
    <main className="admin-page analytics-page">
      <header className="admin-page-header split">
        <div>
          <p className="admin-eyebrow">美國三校</p>
          <h1>流量與報名</h1>
          <p>進站、實體說明會報名、名單彈窗。數字不含測試姓名。</p>
          <p className="analytics-period-caption">統計期間：{report.periodCaption}（台北時間）</p>
        </div>
        <nav className="analytics-range" aria-label="統計區間">
          {([1, 7, 30] as const).map(days => (
            <a key={days} className={report.days === days ? 'active' : ''} href={`/admin/us3?range=${days}`}>
              {days === 1 ? '24 小時' : `${days} 天`}
            </a>
          ))}
        </nav>
      </header>

      <div className="admin-setup-banner">
        <strong>這裡只統計開始寫入資料庫之後的數字</strong>
        <span>更早的說明會名單留在 Jotform，這頁還沒有接上。確認信照常寄出；記錄失敗不會擋住報名。</span>
      </div>
      {report.unavailable ? (
        <div className="admin-setup-banner analytics-warning">
          <strong>目前讀不到美國三校資料</strong>
          <span>資料庫連線恢復後，數字會重新出現。講師班的既有資料沒有被改動。</span>
        </div>
      ) : null}
      {report.trackingStartedAt ? (
        <div className="admin-setup-banner">
          <strong>美國三校流量自 {formatTaipei(report.trackingStartedAt)} 起</strong>
          <span>這段期間的開頭早於開始記錄的時間，因此只涵蓋有資料的區間。</span>
        </div>
      ) : null}
      {report.capped ? (
        <div className="admin-setup-banner analytics-warning">
          <strong>這段期間的事件已達讀取上限</strong>
          <span>只取最新一頁，數字可能低於實際。</span>
        </div>
      ) : null}
      {report.excludedTests ? (
        <div className="admin-setup-banner">
          <strong>已排除 {report.excludedTests} 筆測試姓名</strong>
          <span>姓名去掉空白後，完全等於「elsa測試」、「elsa」（大小寫不拘）或「廖子淇」的說明會報名與名單不計入統計。進站次數仍包含所有造訪。</span>
        </div>
      ) : null}

      <section className="analytics-kpis" aria-label="美國三校摘要">
        <article>
          <span>造訪次數</span>
          <strong>{report.kpis.visits}</strong>
          <small>{report.kpis.visitors} 位不重複訪客</small>
        </article>
        <article>
          <span>實體說明會報名</span>
          <strong>{report.kpis.seminarSignups}</strong>
          <small>12/16 {report.kpis.seminar1216} · 12/23 {report.kpis.seminar1223} · 12/30 {report.kpis.seminar1230}</small>
        </article>
        <article>
          <span>名單</span>
          <strong>{report.kpis.leads}</strong>
          <small>首頁與劍橋頁的彈窗</small>
        </article>
        <article>
          <span>說明會頁</span>
          <strong>{report.funnel.seminarPage}</strong>
          <small>實體說明會頁面造訪</small>
        </article>
        <article>
          <span>線上說明會</span>
          <strong>{report.funnel.webinarPage}</strong>
          <small>頁面造訪</small>
        </article>
        <article>
          <span>劍橋頁</span>
          <strong>{report.funnel.cambridgePage}</strong>
          <small>頁面造訪</small>
        </article>
      </section>

      <section className="analytics-overview-grid">
        <div className="admin-panel analytics-trend-panel">
          <div className="admin-section-heading">
            <div>
              <h2>每天的進站與報名</h2>
              <p>造訪、名單、實體說明會報名</p>
            </div>
            <span>{rangeLabel}</span>
          </div>
          <TrafficTrendChart
            points={report.trend}
            legend={{ visits: '造訪', forms: '名單', completions: '實體報名', title: '美國三校每天的進站與報名', description: '比較各日的造訪、名單與實體說明會報名。' }}
          />
        </div>
        <div className="admin-panel analytics-breakdown-panel">
          <div className="admin-section-heading"><div><h2>流量來源</h2><p>有 UTM 時用來源與媒介，否則用來路網域</p></div></div>
          <HorizontalBreakdown items={report.sources} total={report.kpis.visits} emptyLabel="這段時間還沒有進站紀錄。" />
          <div className="analytics-subsection-heading"><h3>頁面</h3><span>{report.kpis.visits} 次造訪</span></div>
          <HorizontalBreakdown items={report.pages} total={report.kpis.visits} emptyLabel="這段時間還沒有進站紀錄。" />
        </div>
      </section>

      <section className="analytics-depth-grid">
        <div className="admin-panel analytics-funnel-panel">
          <div className="admin-section-heading">
            <div><h2>報名漏斗</h2><p>進站與說明會頁是頁面造訪。送出報名以寫入的說明會報名為準。</p></div>
            <span>{report.kpis.visits} 次造訪</span>
          </div>
          <JourneyPathVisual
            steps={journeyFromCounts([
              { label: '進站', count: report.kpis.visits },
              { label: '實體說明會頁', count: report.funnel.seminarPage },
              { label: '送出報名', count: report.kpis.seminarSignups },
            ])}
            outcomes={[
              { label: '實體報名', value: report.kpis.seminarSignups, rate: percent(report.kpis.seminarSignups, top), tone: 'conversion' },
              { label: '名單', value: report.kpis.leads, rate: percent(report.kpis.leads, top), tone: 'contact' },
            ]}
          />
        </div>
        <div className="admin-panel">
          <div className="admin-section-heading"><div><h2>說明會場次</h2><p>12/16、12/23、12/30，台北時間下午兩點</p></div></div>
          <HorizontalBreakdown items={report.sessions} total={report.kpis.seminarSignups} emptyLabel="這段時間還沒有實體說明會報名。" />
          <div className="analytics-subsection-heading"><h3>報名來源</h3><span>{report.kpis.seminarSignups} 筆</span></div>
          <HorizontalBreakdown items={report.signupSources} total={report.kpis.seminarSignups} emptyLabel="這段時間還沒有實體說明會報名。" />
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-section-heading">
          <div><h2>有報名或名單的日期</h2><p>只列出有實體報名或名單的日子。每天的造訪見上方圖表。</p></div>
          <span>{rangeLabel}</span>
        </div>
        {report.dailySignups.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>日期</th><th>造訪</th><th>實體報名</th><th>名單</th></tr>
              </thead>
              <tbody>
                {report.dailySignups.map(row => (
                  <tr key={row.label}>
                    <td data-label="日期">{row.label}</td>
                    <td data-label="造訪">{row.visits}</td>
                    <td data-label="實體報名">{row.signups}</td>
                    <td data-label="名單">{row.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="analytics-inline-empty">這段時間還沒有實體說明會報名或名單。</p>}
      </section>
    </main>
  );
}
