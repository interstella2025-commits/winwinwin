import type { CSSProperties } from 'react';
import { offerBarPercent } from '../../lib/admin/offer-bars';

type TrendPoint = {
  label: string;
  visits: number;
  formStarts: number;
  completions: number;
};

type LabeledValue = {
  label: string;
  value: number;
};

type JourneyStep = LabeledValue & {
  rate: number;
  dropOff: number;
  bypass: number;
};

type JourneyOutcome = LabeledValue & {
  rate: number;
  tone: 'contact' | 'conversion';
};

type OfferVisual = {
  key: string;
  name: string;
  starts: number;
  submits: number;
  completions: number;
};

const chartWidth = 760;
const chartHeight = 286;
const chartPadding = { top: 18, right: 18, bottom: 42, left: 42 };

function linePoints(points: TrendPoint[], key: keyof Omit<TrendPoint, 'label'>, maximum: number) {
  const width = chartWidth - chartPadding.left - chartPadding.right;
  const height = chartHeight - chartPadding.top - chartPadding.bottom;
  return points.map((point, index) => {
    const x = chartPadding.left + (points.length === 1 ? width / 2 : (index / (points.length - 1)) * width);
    const y = chartPadding.top + height - (point[key] / maximum) * height;
    return { x, y, value: point[key] };
  });
}

function linePath(points: { x: number; y: number }[]) {
  return points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
}

export function TrafficTrendChart({ points }: { points: TrendPoint[] }) {
  const maximum = Math.max(1, ...points.flatMap(point => [point.visits, point.formStarts, point.completions]));
  const visits = linePoints(points, 'visits', maximum);
  const forms = linePoints(points, 'formStarts', maximum);
  const completions = linePoints(points, 'completions', maximum);
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const plotBottom = chartHeight - chartPadding.bottom;
  const areaPath = `${linePath(visits)} L${visits.at(-1)?.x || chartPadding.left},${plotBottom} L${visits[0]?.x || chartPadding.left},${plotBottom} Z`;

  return (
    <div className="analytics-trend-chart">
      <div className="analytics-chart-legend" aria-label="圖例">
        <span className="visits">造訪</span>
        <span className="products">開始填表</span>
        <span className="purchases">完成報名</span>
      </div>
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-labelledby="traffic-trend-title traffic-trend-description">
        <title id="traffic-trend-title">流量與轉換趨勢</title>
        <desc id="traffic-trend-description">比較各時段的造訪、開始填表與完成報名次數。</desc>
        <defs>
          <linearGradient id="traffic-area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#8b665c" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b665c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(portion => {
          const y = chartPadding.top + (1 - portion) * (chartHeight - chartPadding.top - chartPadding.bottom);
          return (
            <g key={portion}>
              <line className="analytics-chart-gridline" x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} />
              <text className="analytics-chart-axis" x={chartPadding.left - 10} y={y + 4} textAnchor="end">{Math.round(maximum * portion)}</text>
            </g>
          );
        })}
        <path className="analytics-chart-area" d={areaPath} />
        <path className="analytics-chart-line visits" d={linePath(visits)} />
        <path className="analytics-chart-line products" d={linePath(forms)} />
        <path className="analytics-chart-line purchases" d={linePath(completions)} />
        {visits.map((point, index) => (
          <g key={`visit-${points[index].label}`}>
            <circle className="analytics-chart-point visits" cx={point.x} cy={point.y} r="3.5">
              <title>{`${points[index].label}：${point.value} 次造訪`}</title>
            </circle>
            {index % labelEvery === 0 ? <text className="analytics-chart-axis x" x={point.x} y={chartHeight - 14} textAnchor="middle">{points[index].label}</text> : null}
          </g>
        ))}
        {forms.map((point, index) => (
          <circle className="analytics-chart-point products" cx={point.x} cy={point.y} r="3" key={`${points[index].label}-form`}>
            <title>{`${points[index].label}：${point.value} 次開始填表`}</title>
          </circle>
        ))}
        {completions.map((point, index) => (
          <circle className="analytics-chart-point purchases" cx={point.x} cy={point.y} r="3" key={`${points[index].label}-done`}>
            <title>{`${points[index].label}：${point.value} 次完成報名`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

export function HorizontalBreakdown({ items, total, emptyLabel }: { items: LabeledValue[]; total: number; emptyLabel: string }) {
  if (!items.length || !total) return <p className="analytics-inline-empty">{emptyLabel}</p>;
  const maximum = Math.max(...items.map(item => item.value), 1);
  return (
    <div className="analytics-breakdown">
      {items.map(item => (
        <div className="analytics-breakdown-row" key={item.label}>
          <div><strong>{item.label}</strong><span>{Math.round(item.value / total * 100)}%</span></div>
          <div className="analytics-mini-bar" aria-label={`${item.label} ${item.value} 次`}>
            <i style={{ width: `${Math.max(3, item.value / maximum * 100)}%` }} />
          </div>
          <b>{item.value}</b>
        </div>
      ))}
    </div>
  );
}

export function DeviceRing({ items }: { items: LabeledValue[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const colors = ['#694c45', '#a67d70', '#d5b9ae', '#d8d0c8'];
  let accumulated = 0;
  const segments = items.map((item, index) => {
    const start = total ? accumulated / total * 360 : 0;
    accumulated += item.value;
    const end = total ? accumulated / total * 360 : 0;
    return `${colors[index % colors.length]} ${start}deg ${end}deg`;
  });
  const background = total ? `conic-gradient(${segments.join(', ')})` : '#e8e2dc';
  return (
    <div className="analytics-device-visual">
      <div className="analytics-device-ring" style={{ background }} role="img" aria-label={`共 ${total} 次造訪`}>
        <div><strong>{total}</strong><span>次造訪</span></div>
      </div>
      <div className="analytics-device-legend">
        {items.map((item, index) => (
          <div key={item.label}>
            <i style={{ background: colors[index % colors.length] }} />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function JourneyPathVisual({ steps, outcomes = [] }: { steps: JourneyStep[]; outcomes?: JourneyOutcome[] }) {
  if (!steps.length || !steps[0].value) {
    return <p className="analytics-inline-empty">這個區間還沒有足夠的訪客資料可建立旅程路徑。</p>;
  }

  return (
    <div className="analytics-journey-visual">
      <ol className="analytics-journey-map" aria-label="訪客旅程路徑" style={{ '--journey-step-count': steps.length } as CSSProperties}>
        {steps.map((step, index) => {
          const next = steps[index + 1];
          const isLast = !next;
          const isConversion = /完成|付款/.test(step.label);
          const isNonLinear = step.bypass > 0;
          const showBranch = !isLast && (step.dropOff > 0 || isNonLinear);
          return (
            <li className={index % 2 ? 'branch-bottom' : 'branch-top'} key={step.label}>
              {showBranch ? (
                <div className={`analytics-journey-branch${isNonLinear ? ' is-nonlinear' : ''}`}>
                  {step.dropOff > 0 ? <><span>流失</span><strong>{step.dropOff}<small>次</small></strong></> : null}
                  {isNonLinear ? <small>跳步 +{step.bypass}</small> : null}
                </div>
              ) : null}
              <div className={`analytics-journey-node${isConversion ? ' is-conversion' : ''}`}>
                <span>{step.label}</span>
                <strong>{step.value}<small>次</small></strong>
                <div>
                  <small>{isConversion ? '完成率' : '到達率'} {step.rate}%</small>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {outcomes.length ? (
        <div className="analytics-journey-outcomes" aria-label="旅程結果">
          <span>這條路徑的結果</span>
          <div>
            {outcomes.map(outcome => (
              <article className={`is-${outcome.tone}`} key={outcome.label}>
                <span>{outcome.label}</span>
                <strong>{outcome.value}<small>筆</small></strong>
                <small>占進站 {outcome.rate}%</small>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ScrollDepthVisual({ items, total }: { items: LabeledValue[]; total: number }) {
  const depthNames: Record<string, string> = {
    '25%': '前段',
    '50%': '中段',
    '75%': '後段',
    '90%': '頁尾',
  };
  return (
    <div className="analytics-scroll-visual" aria-label="訪客捲動深度">
      {items.map(item => {
        const rate = total ? Math.round(item.value / total * 100) : 0;
        return (
          <div key={item.label}>
            <div className="analytics-scroll-label">
              <strong>{depthNames[item.label] || item.label}</strong>
              <small>頁面 {item.label}</small>
            </div>
            <div className="analytics-scroll-track" aria-hidden="true">
              <i style={{ width: `${rate}%` }} />
            </div>
            <div className="analytics-scroll-value">
              <strong>{item.value}<small>次</small></strong>
              <span>占全部 {rate}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function OfferPerformanceVisual({ offers }: { offers: OfferVisual[] }) {
  if (!offers.length) return <p className="analytics-inline-empty">有人開始填表後，這裡會出現比較圖。</p>;
  return (
    <div className="analytics-service-visual">
      <div className="analytics-service-legend" aria-label="圖例">
        <span className="views">開始填表</span>
        <span className="videos">送出</span>
        <span className="purchases">完成</span>
      </div>
      {offers.map(offer => (
        <div className="analytics-service-row" key={offer.key}>
          <div className="analytics-service-name"><strong>{offer.name}</strong><span>{offer.starts} 次開始填表</span></div>
          <div className="analytics-service-bars">
            {([
              ['views', offer.starts],
              ['videos', offer.submits],
              ['purchases', offer.completions],
            ] as const).map(([tone, value]) => (
              <div className={tone} key={tone} style={{ width: `${offerBarPercent(value, offer.starts, offer.submits, offer.completions)}%` }}>
                {value ? <span>{value}</span> : null}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function journeyFromCounts(steps: { label: string; count: number }[]): JourneyStep[] {
  const top = steps[0]?.count || 0;
  return steps.map((step, index) => {
    const previous = index === 0 ? step.count : steps[index - 1].count;
    return {
      label: step.label,
      value: step.count,
      rate: top ? Math.round((step.count / top) * 100) : 0,
      dropOff: Math.max(0, previous - step.count),
      bypass: Math.max(0, step.count - previous),
    };
  });
}
