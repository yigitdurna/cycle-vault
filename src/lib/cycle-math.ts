/**
 * Cycle prediction engine.
 * All date strings are "YYYY-MM-DD" format.
 *
 * Evidence basis:
 * - Bull et al. 2019 (612,613 cycles): mean luteal phase 12.4 days
 * - Fertile window estimated as cycle days med-16 to med-10
 * - Calendar-only methods predict ovulation correctly ~21% of the time (Johnson et al. 2018)
 */
import type { Cycle, PhaseResult } from '../types';

// --- Date helpers ---

/** Date → "YYYY-MM-DD" (noon-safe to avoid DST issues) */
export function ymd(d: Date): string {
  const dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" → Date (noon) */
export function fromYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

/** Add n days to a Date */
export function addDays(d: Date, n: number): Date {
  const t = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  t.setDate(t.getDate() + n);
  return t;
}

/** Days between two "YYYY-MM-DD" strings */
export function diff(a: string, b: string): number {
  return Math.round((fromYmd(a).getTime() - fromYmd(b).getTime()) / (24 * 60 * 60 * 1000));
}

/** "15 March 2025" — pass the active locale so months/weekdays localize. */
export function nice(s: string, locale?: string): string {
  return fromYmd(s).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "15 Mar" — pass the active locale so the month abbreviation localizes. */
export function niceShort(s: string, locale?: string): string {
  return fromYmd(s).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** "15th of Mar, 2025" (English ordinal form; other locales just localize the
 *  month). Pass the active locale so the month abbreviation localizes. */
export function niceFull(s: string, locale?: string): string {
  const d = fromYmd(s);
  const day = d.getDate();
  const month = d.toLocaleDateString(locale, { month: 'short' });
  const year = d.getFullYear();

  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';

  return `${day}${suffix} of ${month}, ${year}`;
}

// --- Stats ---

function cycleLens(starts: string[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < starts.length; i++) out.push(diff(starts[i], starts[i - 1]));
  return out;
}

function median(arr: number[]): number {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface CycleStats {
  med: number;
  starts: string[];
}

export function getCycleStats(cycles: Cycle[], fallback = 28): CycleStats | null {
  if (!cycles.length) return null;
  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const starts = sorted.map(c => c.start);
  const lens = cycleLens(starts);
  // Use only the most recent 6 cycle lengths — recent cycles are more predictive
  const recentLens = lens.slice(-Math.min(6, lens.length));
  const med = recentLens.length ? Math.round(median(recentLens)) : fallback;
  return { med, starts };
}

// --- Core Prediction Logic ---

/** How far ahead we estimate periods (~12 months). Calendar-only prediction
 *  drifts further out, so estimates beyond this are not shown. */
export const MAX_FORECAST_DAYS = 372;

export function getPhaseForDate(dateStr: string, cycles: Cycle[], fallback = 28): PhaseResult | null {
  const stats = getCycleStats(cycles, fallback);
  if (!stats) return null;

  // 1. Check if inside a recorded period (Exact Match). An active (open) cycle
  //    counts as a recorded period from its start through today, so an ongoing
  //    period keeps showing as "period" past the default 5-day length.
  const todayStr = ymd(new Date());
  const recorded = cycles.find(c =>
    (c.end && dateStr >= c.start && dateStr <= c.end) ||
    (c.end === null && dateStr >= c.start && dateStr <= todayStr)
  );
  if (recorded) {
    return { type: 'period', day: diff(dateStr, recorded.start) + 1, recorded: true };
  }

  // 2. Find "Anchor" Cycle (Latest start date <= dateStr)
  const anchorStart = stats.starts.filter(s => s <= dateStr).pop();

  if (!anchorStart) {
    return { type: 'future', msg: 'No data yet' };
  }

  // 3. Calculate Position in Cycle (no modulo — daysSince is used directly)
  const daysSince = diff(dateStr, anchorStart);

  const med = stats.med;

  // Estimate up to ~12 months ahead so users can plan around future periods
  // (e.g. holidays). Beyond that the calendar-only estimate drifts too much to
  // be meaningful, so we stop predicting.
  if (daysSince > MAX_FORECAST_DAYS) return null;

  // Which predicted cycle the date falls in: 0 = the current cycle, 1+ = future
  // estimated cycles. Future cycles show ONLY the estimated period days.
  const cycleNum = Math.floor(daysSince / med);
  const dayInCycle = daysSince - cycleNum * med;

  // 1-based cycle day (cycle day 1 = the first day of the period). Every phase
  // boundary below is expressed as a cycle-day number, so they are compared
  // against this — NOT the 0-based `dayInCycle`. Returning `cycleDay` as the
  // `day` field also keeps all phases consistent with the recorded-period
  // branch above, which is likewise 1-based.
  const cycleDay = dayInCycle + 1;

  // Determine Period Length for Anchor
  let periodLen = 5;
  const anchorObj = cycles.find(c => c.start === anchorStart);
  if (anchorObj && anchorObj.end) {
    periodLen = diff(anchorObj.end, anchorObj.start) + 1;
  }

  // For any FUTURE estimated cycle (cycleNum >= 1): if the user has already
  // recorded an actual cycle starting after the anchor, every estimate from
  // this anchor is superseded — don't colour those days as predicted period.
  if (cycleNum >= 1) {
    const hasActualNextCycle = stats.starts.some(s => s > anchorStart!);
    if (hasActualNextCycle) return null;
  }

  // Determine Phase (all boundaries are 1-based cycle-day numbers)
  if (cycleDay >= 1 && cycleDay <= periodLen) {
    return { type: 'period', day: cycleDay, recorded: false };
  }

  // Future estimated cycles only surface their period days — the fertile /
  // ovulation / luteal detail below is for the current cycle only, where it's
  // accurate enough to be useful.
  if (cycleNum >= 1) return null;

  // Evidence-based fertile window (Bull et al. 2019), as cycle-day numbers.
  // Luteal phase mean 12.4 days → ovulation ≈ cycle day (med − 14); the
  // fertile window spans cycle days (med − 16) … (med − 10). It can't begin
  // before the day after the period ends.
  const fertileStart = Math.max(periodLen + 1, med - 16);
  const fertileEnd = med - 10;

  if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
    return {
      type: cycleDay >= med - 14 && cycleDay <= med - 12 ? 'ovulation' : 'fertile',
      day: cycleDay,
      // addDays counts from the anchor (cycle day 1 = offset 0), so subtract 1.
      fertileStart: addDays(fromYmd(anchorStart), fertileStart - 1),
      fertileEnd: addDays(fromYmd(anchorStart), fertileEnd - 1),
    };
  }
  if (cycleDay > fertileEnd) {
    return { type: 'luteal', day: cycleDay };
  }

  return { type: 'follicular', day: cycleDay };
}

// --- Next Period Calculation (from renderDashboard) ---

export function getNextPeriodDate(cycles: Cycle[], fallback = 28): { date: string; daysToNext: number } | null {
  const stats = getCycleStats(cycles, fallback);
  if (!stats) return null;

  const todayYmd = ymd(new Date());
  const anchorStart = stats.starts.filter(s => s <= todayYmd).pop() || stats.starts[0];

  if (!anchorStart) return null;

  // The first period predicted after the most recent recorded cycle start:
  // anchorStart + one median cycle. We intentionally do NOT skip ahead past
  // missed periods — if today is past this date and no newer cycle has been
  // logged, the period is overdue and we surface that (negative daysToNext)
  // rather than hiding it behind a future prediction.
  const nextStart = ymd(addDays(fromYmd(anchorStart), stats.med));

  // If the user has already logged an actual cycle starting after the anchor,
  // this prediction has been superseded — don't show a stale overdue period.
  if (stats.starts.some(s => s > anchorStart)) return null;

  const daysToNext = diff(nextStart, todayYmd);
  return { date: nextStart, daysToNext };
}

export interface UpcomingPeriod {
  /** Predicted period start date, "YYYY-MM-DD". */
  date: string;
  /** Days from today until that date (negative if already overdue). */
  daysToNext: number;
}

/**
 * Estimated start dates of the next `count` periods from today, for planning
 * ahead (e.g. holidays). Each is anchorStart + median × n. Only future dates
 * (today or later) are returned, capped to the ~12-month forecast horizon.
 * Returns [] when there's no data or the prediction has been superseded by a
 * more recently recorded cycle.
 */
export function getUpcomingPeriods(cycles: Cycle[], fallback = 28, count = 6): UpcomingPeriod[] {
  const stats = getCycleStats(cycles, fallback);
  if (!stats) return [];

  const todayYmd = ymd(new Date());
  const anchorStart = stats.starts.filter(s => s <= todayYmd).pop() || stats.starts[0];
  if (!anchorStart) return [];

  // A real cycle logged after the anchor supersedes these estimates.
  if (stats.starts.some(s => s > anchorStart)) return [];

  const out: UpcomingPeriod[] = [];
  for (let n = 1; out.length < count && stats.med * n <= MAX_FORECAST_DAYS; n++) {
    const date = ymd(addDays(fromYmd(anchorStart), stats.med * n));
    if (date >= todayYmd) out.push({ date, daysToNext: diff(date, todayYmd) });
  }
  return out;
}

/** Get current cycle day (1-based) relative to most recent cycle start */
export function getCurrentCycleDay(cycles: Cycle[], fallback = 28): number | null {
  const stats = getCycleStats(cycles, fallback);
  if (!stats) return null;

  const todayYmd = ymd(new Date());
  const anchorStart = stats.starts.filter(s => s <= todayYmd).pop();
  if (!anchorStart) return null;

  return diff(todayYmd, anchorStart) + 1;
}

// --- History / summary statistics (for the dashboard) ---

export interface CycleHistoryStats {
  /** Number of cycles recorded. */
  cycleCount: number;
  /** Median start-to-start cycle length, or null with < 2 cycles. */
  medianCycle: number | null;
  /** Average recorded period (bleed) length, or null if none closed. */
  avgPeriod: number | null;
  shortestCycle: number | null;
  longestCycle: number | null;
  /** Regularity bucket from the spread of cycle lengths (needs >= 3 cycles). */
  regularity: 'regular' | 'mostly regular' | 'irregular' | null;
  /** Recent cycles, newest first, with their start-to-start length (last is null = ongoing). */
  recent: { start: string; end: string | null; length: number | null }[];
}

export function getCycleHistoryStats(cycles: Cycle[]): CycleHistoryStats {
  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const starts = sorted.map(c => c.start);

  const lens: number[] = [];
  for (let i = 1; i < starts.length; i++) lens.push(diff(starts[i], starts[i - 1]));

  const periodLens = sorted
    .filter(c => c.end)
    .map(c => diff(c.end as string, c.start) + 1);

  const medianCycle = lens.length ? Math.round(median(lens)) : null;
  const shortestCycle = lens.length ? Math.min(...lens) : null;
  const longestCycle = lens.length ? Math.max(...lens) : null;
  const avgPeriod = periodLens.length
    ? Math.round(periodLens.reduce((a, b) => a + b, 0) / periodLens.length)
    : null;

  let regularity: CycleHistoryStats['regularity'] = null;
  if (lens.length >= 2 && shortestCycle !== null && longestCycle !== null) {
    const spread = longestCycle - shortestCycle;
    regularity = spread <= 3 ? 'regular' : spread <= 7 ? 'mostly regular' : 'irregular';
  }

  // Recent cycles newest-first; length is the gap to the NEXT start (null for the latest).
  const recent = sorted
    .map((c, i) => ({
      start: c.start,
      end: c.end,
      length: i < sorted.length - 1 ? diff(sorted[i + 1].start, c.start) : null,
    }))
    .reverse()
    .slice(0, 4);

  return { cycleCount: cycles.length, medianCycle, avgPeriod, shortestCycle, longestCycle, regularity, recent };
}
