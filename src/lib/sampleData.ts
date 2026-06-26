/**
 * DEV-ONLY realistic sample data for reviewing the app. Never shipped — the
 * only caller is guarded by `import.meta.env.DEV`.
 *
 * Produces 4 cycles ending ~16 days ago (so we're mid-cycle with a clear
 * next-period forecast and a sensible cycle day) with varied lengths
 * (29 / 32 / 28 days) and a realistic spread of symptom logs.
 */
import { ymd, addDays } from './cycle-math';
import type { Cycle, DayLogs } from '../types';

export function buildSampleData(): { cycles: Cycle[]; logs: DayLogs } {
  const t = new Date();
  const d = (offset: number) => ymd(addDays(t, offset));

  // start-to-start lengths: 29, 32, 28; most recent period 16 days ago.
  const cycles: Cycle[] = [
    { start: d(-105), end: d(-101) },
    { start: d(-76), end: d(-72) },
    { start: d(-44), end: d(-40) },
    { start: d(-16), end: d(-12) },
  ];

  const logs: DayLogs = {
    // last period
    [d(-16)]: { date: d(-16), flow: 'heavy', cramps: 3, mood: ['irritable', 'sad'], energy: 1, pain: { locations: ['back'], severity: 2 } },
    [d(-15)]: { date: d(-15), flow: 'heavy', cramps: 2, mood: ['sad'], energy: 1 },
    [d(-14)]: { date: d(-14), flow: 'medium', cramps: 1, mood: ['calm'], energy: 2 },
    [d(-13)]: { date: d(-13), flow: 'light', mood: ['calm'] },
    // follicular
    [d(-9)]: { date: d(-9), mood: ['energetic'], energy: 3, note: 'great workout today' },
    [d(-4)]: { date: d(-4), mood: ['happy'], energy: 3 },
    // current
    [d(-1)]: { date: d(-1), mood: ['calm'], energy: 2, sleep: 3 },
    [d(0)]: { date: d(0), mood: ['happy'], energy: 2, note: 'feeling good' },
  };

  return { cycles, logs };
}

/** Write sample data to localStorage and reload (DEV reviewing only). */
export function loadSampleData(): void {
  const { cycles, logs } = buildSampleData();
  localStorage.setItem('cycle-tracker-calendar-v4', JSON.stringify(cycles));
  localStorage.setItem('cycle-tracker-daylogs-v1', JSON.stringify(logs));
  location.reload();
}
