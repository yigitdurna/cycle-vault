import { describe, it, expect } from 'vitest';
import { dayLogHasData } from '../useDayLogs';
import type { DayLog } from '../../types';

describe('dayLogHasData', () => {
  it('returns false for undefined', () => {
    expect(dayLogHasData(undefined)).toBe(false);
  });

  it('returns false for a log with only a date and history (all cleared)', () => {
    const log: DayLog = {
      date: '2026-06-01',
      mood: [],
      history: [{ timestamp: '2026-06-01T10:00:00.000Z', flow: 'medium' }],
    };
    expect(dayLogHasData(log)).toBe(false);
  });

  it('returns true when flow is present', () => {
    expect(dayLogHasData({ date: '2026-06-01', flow: 'light' })).toBe(true);
  });

  it('returns true when mood has entries', () => {
    expect(dayLogHasData({ date: '2026-06-01', mood: ['happy'] })).toBe(true);
  });

  it('returns true when a note is present', () => {
    expect(dayLogHasData({ date: '2026-06-01', note: 'tired' })).toBe(true);
  });

  it('returns true when functionalImpact is explicitly false', () => {
    expect(dayLogHasData({ date: '2026-06-01', functionalImpact: false })).toBe(true);
  });

  it('returns true for energy / cramps / sleep / pain', () => {
    expect(dayLogHasData({ date: '2026-06-01', energy: 2 })).toBe(true);
    expect(dayLogHasData({ date: '2026-06-01', cramps: 1 })).toBe(true);
    expect(dayLogHasData({ date: '2026-06-01', sleep: 2 })).toBe(true);
    expect(dayLogHasData({ date: '2026-06-01', pain: { locations: ['head'], severity: 2 } })).toBe(true);
  });
});
