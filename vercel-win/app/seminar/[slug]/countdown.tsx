import { countdownParts } from '@/lib/seminar/clock';

export default function Countdown({ ms, compact = false, label }: { ms: number; compact?: boolean; label?: string }) {
  const p = countdownParts(Math.max(0, ms));
  if (compact) {
    const hh = p.d * 24 + p.h;
    return <span className="sm-num">{hh > 0 ? `${String(hh).padStart(2, '0')}:` : ''}{String(p.m).padStart(2, '0')}:{String(p.s).padStart(2, '0')}</span>;
  }
  const cells: Array<[number, string]> = p.d > 0 ? [[p.d, "天"], [p.h, "時"], [p.m, '分'], [p.s, '秒']] : [[p.h, "時"], [p.m, '分'], [p.s, '秒']];
  return (
    <div className="sm-countdown" role="timer" aria-label={label}>
      {cells.map(([v, u]) => <div key={u}><b className="sm-num">{String(v).padStart(2, '0')}</b><span>{u}</span></div>)}
    </div>
  );
}
