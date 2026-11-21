import { formatDuration, formatDurationCompact, formatTaipei, type DashboardReport, type FunnelStep } from '../../lib/admin/report';
import {
  DeviceRing,
  HorizontalBreakdown,
  JourneyPathVisual,
  OfferPerformanceVisual,
  ScrollDepthVisual,
  TrafficTrendChart,
  journeyFromCounts,
} from './analytics-visuals';

function money(amount: number) {
  return `NT$${amount.toLocaleString('zh-TW')}`;
}

function percent(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0;
}

function FunnelBlock({ title, note, steps, outcomes }: {
  title: string;
  note: string;
  steps: FunnelStep[];
  outcomes: { label: string; value: number; tone: 'contact' | 'conversion' }[];
}) {
  const top = steps[0]?.count || 0;
  return (
    <div className="win-admin-funnel-block">
      <h3>{title}</h3>
      <p className="admin-muted" style={{ margin: '0 0 8px' }}>{note}</p>
      <JourneyPathVisual
        steps={journeyFromCounts(steps.map(step => ({ label: step.label, count: step.count })))}
        outcomes={outcomes.map(outcome => ({ ...outcome, rate: percent(outcome.value, top) }))}
      />
    </div>
  );
}

export default function DashboardView({ report }: { report: DashboardReport }) {
  const rangeLabel = report.days === 1 ? '最近 24 小時' : `最近 ${report.days} 天`;
  return (
    <main className="admin-page analytics-page">
      <header className="admin-page-header split">
        <div>
          <p className="admin-eyebrow">DATA OVERVIEW</p>
          <h1>流量與訪客旅程</h1>
          <p>先看整體趨勢，再查看報名與付款結果。</p>
          <p className="analytics-period-caption">統計期間：{report.periodCaption}（台北時間）</p>
        </div>
        <nav className="analytics-range" aria-label="統計區間">
          {([1, 7, 30] as const).map(days => (
            <a key={days} className={report.days === days ? 'active' : ''} href={`/admin/dashboard?range=${days}`}>
              {days === 1 ? '24 小時' : `${days} 天`}
            </a>
          ))}
        </nav>
      </header>

      {report.fixture ? (
        <div className="admin-setup-banner analytics-warning">
          <strong>此畫面是本機示範資料</strong>
          <span>用來預覽版面。正式環境不會使用這批數字。</span>
        </div>
      ) : null}
      {report.analyticsUnavailable ? (
        <div className="admin-setup-banner analytics-warning">
          <strong>流量資料表尚未啟用</strong>
          <span>請先套用 migration 0003_site_analytics.sql。報名與付款仍會盡量從既有資料讀取。</span>
        </div>
      ) : null}
      {report.registrationsUnavailable ? (
        <div className="admin-setup-banner analytics-warning">
          <strong>目前讀不到報名與付款資料</strong>
          <span>資料庫連線恢復後，名單與統計會重新出現。</span>
        </div>
      ) : null}
      {report.kpis.excludedTestNames ? (
        <div className="admin-setup-banner">
          <strong>已自列表與統計排除 {report.kpis.excludedTestNames} 筆測試姓名資料</strong>
          <span>姓名去掉前後空白後，完全等於「elsa測試」、「Elsa」（大小寫不拘）或「廖子淇」的報名與訂單不會顯示、也不計入數字。資料仍留在資料庫。<a href="/admin/test-registrations">查看並匯出這些資料</a></span>
        </div>
      ) : null}

      <section className="analytics-kpis" aria-label="流量摘要">
        <article>
          <span>不重複訪客</span>
          <strong>{report.kpis.visitors}</strong>
          <small>{report.kpis.sessions} 次造訪</small>
        </article>
        <article>
          <span>平均停留</span>
          <strong>{formatDurationCompact(report.kpis.averageDwellSeconds)}</strong>
          <small>中位數 {formatDuration(report.kpis.medianDwellSeconds)}</small>
        </article>
        <article>
          <span>平均捲動</span>
          <strong>{report.kpis.averageScroll}%</strong>
          <small>依進站次數</small>
        </article>
        <article>
          <span>點擊報名率</span>
          <strong>{percent(report.funnels.online[1]?.count || 0, report.kpis.sessions)}%</strong>
          <small>{report.funnels.online[1]?.count || 0}／{report.kpis.sessions} 次造訪</small>
        </article>
        <article>
          <span>線上免費登記</span>
          <strong>{report.kpis.freeOnline}</strong>
          <small>未完成付款 {report.kpis.onlineAbandoned}</small>
        </article>
        <article>
          <span>實體已付款</span>
          <strong>{report.kpis.inpersonPaid}</strong>
          <small>{money(report.kpis.inpersonPaidAmount)} · 12/16 {report.kpis.inpersonPaid1216} · 12/23 {report.kpis.inpersonPaid1223}</small>
        </article>
        <article>
          <span>線上已付款</span>
          <strong>{report.kpis.onlinePaid}</strong>
          <small>既有 {money(report.kpis.onlinePaidAmount)}</small>
        </article>
      </section>

      <section className="admin-panel" aria-labelledby="signup-result-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="signup-result-title">報名結果</h2>
            <p>線上沒有付款訂單，才算免費登記。實體課以已付款、金額 399、且不是 NT$1 測試單計算。姓名完全符合測試名單的報名已從這裡扣除。</p>
          </div>
          <span>{rangeLabel}</span>
        </div>
        <div className="analytics-detail-metrics" aria-label="報名結果摘要">
          <article><span>免費登記</span><strong>{report.kpis.freeOnline} 筆</strong></article>
          <article><span>線上未完成付款</span><strong>{report.kpis.onlineAbandoned} 筆</strong></article>
          <article><span>線上已付款</span><strong>{report.kpis.onlinePaid} 筆</strong></article>
          <article><span>實體已付款</span><strong>{report.kpis.inpersonPaid} 筆</strong></article>
          <article><span>實體未完成付款</span><strong>{Math.max(0, report.kpis.inpersonStarted - report.kpis.inpersonPaid)} 筆</strong></article>
          <article><span>其他場次通知</span><strong>{report.kpis.notify} 筆</strong></article>
          <article><span>NT$1 測試單</span><strong>{report.kpis.excludedTestOrders} 筆</strong></article>
          <article><span>已排除測試姓名</span><strong>{report.kpis.excludedTestNames} 筆</strong></article>
        </div>
      </section>

      <section className="admin-panel" aria-labelledby="event-count-title">
        <div className="admin-section-heading">
          <div>
            <h2 id="event-count-title">頁面互動</h2>
            <p>以下為事件次數，同一訪客重複操作會重複計算。</p>
          </div>
          <span>{rangeLabel}</span>
        </div>
        <div className="analytics-detail-metrics" aria-label="頁面互動事件次數">
          {report.eventCounts.map(item => (
            <article key={item.key}><span>{item.label}</span><strong>{item.count} 次</strong></article>
          ))}
        </div>
      </section>

      <section className="analytics-overview-grid">
        <div className="admin-panel analytics-trend-panel">
          <div className="admin-section-heading">
            <div><h2>流量與轉換趨勢</h2><p>造訪、開始填表與完成報名（免費登記或已付款）</p></div>
            <span>{rangeLabel}</span>
          </div>
          <TrafficTrendChart points={report.trend} />
        </div>
        <div className="admin-panel analytics-breakdown-panel">
          <div className="admin-section-heading"><div><h2>流量來源</h2><p>有 UTM 時用來源與媒介，否則用來路網域</p></div></div>
          <HorizontalBreakdown
            items={report.sources.map(source => ({ label: source.campaign ? `${source.label}｜${source.campaign}` : source.label, value: source.sessions }))}
            total={report.kpis.sessions}
            emptyLabel="這段時間還沒有進站紀錄。"
          />
          <div className="analytics-subsection-heading"><h3>使用裝置</h3><span>{report.kpis.sessions} 次造訪</span></div>
          <DeviceRing items={report.devices.map(device => ({ label: device.label, value: device.count }))} />
        </div>
      </section>

      <section className="analytics-depth-grid">
        <div className="admin-panel analytics-funnel-panel" id="journey">
          <div className="admin-section-heading">
            <div><h2>訪客旅程路徑</h2><p>進站與點擊是全站工作階段。開始填表以後才分線上與實體。完成數以報名與訂單為準。</p></div>
            <span>{report.kpis.sessions} 次造訪</span>
          </div>
          <FunnelBlock
            title="線上免費"
            note="從開始填寫線上表單起只算線上。"
            steps={report.funnels.online}
            outcomes={[
              { label: '免費登記', value: report.kpis.freeOnline, tone: 'conversion' },
              { label: '線上已付款', value: report.kpis.onlinePaid, tone: 'contact' },
              { label: '線上未完成付款', value: report.kpis.onlineAbandoned, tone: 'contact' },
            ]}
          />
          <FunnelBlock
            title="實體課付款"
            note="前往付款與付款完成以訂單為準。12/16 與 12/23 另記在摘要。"
            steps={report.funnels.inperson}
            outcomes={[
              { label: '實體已付款', value: report.kpis.inpersonPaid, tone: 'conversion' },
              { label: '其他場次通知', value: report.kpis.notify, tone: 'contact' },
            ]}
          />
        </div>
        <div className="admin-panel analytics-scroll-panel">
          <div className="admin-section-heading">
            <div>
              <h2>訪客看到哪裡</h2>
              <p>以 {report.kpis.sessions} 次造訪計算，數字是有捲到該深度的次數。停留時間另列於下方。</p>
            </div>
          </div>
          <ScrollDepthVisual items={report.scrollBuckets.map(bucket => ({ label: bucket.label, value: bucket.count }))} total={report.kpis.sessions} />
          <div className="analytics-subsection-heading"><h3>停留時間</h3><span>{report.kpis.sessions} 次造訪</span></div>
          <HorizontalBreakdown
            items={report.dwellBuckets.map(bucket => ({ label: bucket.label, value: bucket.count }))}
            total={report.kpis.sessions}
            emptyLabel="還沒有停留資料。"
          />
        </div>
      </section>

      <section className="admin-panel analytics-service-panel">
        <div className="admin-section-heading">
          <div><h2>課程內容表現</h2><p>比較開始填表、送出與完成</p></div>
          <span>完成數以報名紀錄計算</span>
        </div>
        <OfferPerformanceVisual offers={report.offerPerformance} />
      </section>

      <section className="admin-panel">
        <details className="analytics-journey-disclosure" open>
          <summary className="analytics-ad-summary">
            <div>
              <h2>近期報名</h2>
              <p>顯示前 {Math.min(report.registrations.length, 20)} 筆。測試姓名不會出現在這裡。</p>
            </div>
            <span className="analytics-ad-period">最多顯示 20 筆</span>
            <span className="analytics-ad-toggle" aria-hidden="true" />
          </summary>
          {report.registrations.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>時間</th><th>結果</th><th>姓名</th><th>聯絡</th><th>場次</th></tr>
                </thead>
                <tbody>
                  {report.registrations.map(row => (
                    <tr key={`${row.createdAt}-${row.email}-${row.result}`}>
                      <td data-label="時間">{formatTaipei(row.createdAt)}</td>
                      <td data-label="結果"><strong>{row.result}</strong></td>
                      <td data-label="姓名">{row.name}</td>
                      <td data-label="聯絡">{row.email}<span>{row.phone}</span></td>
                      <td data-label="場次">{row.session}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="analytics-inline-empty">這段時間還沒有報名。</p>}
        </details>
      </section>

      <section className="admin-panel">
        <details className="analytics-journey-disclosure" open>
          <summary className="analytics-ad-summary">
            <div>
              <h2>近期付款</h2>
              <p>線上既有 NT$399 與實體訂單都列在這裡。NT$1 測試單與測試姓名不列入。</p>
            </div>
            <span className="analytics-ad-period">最多顯示 20 筆</span>
            <span className="analytics-ad-toggle" aria-hidden="true" />
          </summary>
          {report.payments.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
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
          ) : <p className="analytics-inline-empty">這段時間還沒有付款訂單。</p>}
        </details>
      </section>
    </main>
  );
}
