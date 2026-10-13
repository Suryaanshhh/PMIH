/** Dates are "YYYY-MM-DD" strings. Both ends of a range are inclusive. */
export interface Interval {
  start: string;
  end: string;
  pct: number;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Monday to Friday days in the range. Ignores public holidays and leave. */
export function workingDays(start: string, end: string): number {
  let count = 0;
  const d = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (d <= last) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

/** Hours = percentage x (weekly capacity / 5) x working days. An ESTIMATE, not a measured value. */
export function estimatePlannedHours(pct: number, weeklyCapacityHours: number, start: string, end: string): number {
  return round2((pct / 100) * (weeklyCapacityHours / 5) * workingDays(start, end));
}

/**
 * Highest total allocation (target + others) on any day inside the target's range.
 * The total only changes on a start date, so checking those days is enough.
 */
export function peakAllocation(target: Interval, others: Interval[]): { peak: number; on: string } {
  const days = new Set<string>([target.start]);
  for (const o of others) {
    if (o.start > target.start && o.start <= target.end) days.add(o.start);
  }
  let best = { peak: 0, on: target.start };
  for (const day of [...days].sort()) {
    const total = target.pct + others.filter((o) => o.start <= day && o.end >= day).reduce((sum, o) => sum + o.pct, 0);
    if (total > best.peak) best = { peak: round2(total), on: day };
  }
  return best;
}