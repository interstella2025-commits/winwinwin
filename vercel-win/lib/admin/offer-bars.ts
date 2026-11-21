/** Width of a course-performance bar, as a percentage of its row. */
export function offerBarPercent(value: number, starts: number, submits: number, completions: number) {
  const maximum = Math.max(1, starts, submits, completions);
  if (value <= 0) return 0;
  return Math.min(100, Math.max(2, (value / maximum) * 100));
}
