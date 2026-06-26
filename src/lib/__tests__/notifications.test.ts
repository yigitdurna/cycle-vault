import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { planNotifications } from '../notifications';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../types';
import type { Cycle, NotificationSettings } from '../../types';

const S = (over: Partial<NotificationSettings> = {}): NotificationSettings => ({
  ...DEFAULT_NOTIFICATION_SETTINGS,
  enabled: true,
  ...over,
});

// One closed cycle → median falls back to 28; next start = 2026-06-29.
const cycles: Cycle[] = [{ start: '2026-06-01', end: '2026-06-05' }];

describe('planNotifications', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 20, 8, 0, 0)); // 2026-06-20
  });
  afterEach(() => vi.useRealTimers());

  const now = new Date(2026, 5, 20, 8, 0, 0);

  it('returns nothing when disabled', () => {
    expect(planNotifications(S({ enabled: false }), cycles, false, 28, now)).toEqual([]);
  });

  it('returns nothing with no cycles and no active period', () => {
    expect(planNotifications(S(), [], false, 28, now)).toEqual([]);
  });

  it('fans out one upcoming reminder per lead day, per predicted cycle', () => {
    const plan = planNotifications(S({ leadDays: [2, 5], periodStartDay: false, periodStartConfirm: false }), cycles, false, 28, now);
    const upcoming = plan.filter(p => p.copyKey === 'upcoming');
    // 2 lead days × 2 cycles (rolling window)
    expect(upcoming.length).toBe(4);
    expect(upcoming.every(p => p.at.getHours() === 9)).toBe(true);
  });

  it('suppresses ovulation and fertile-window when hideFertility is on', () => {
    const on = planNotifications(S({ ovulation: true, fertileWindow: true }), cycles, false, 28, now);
    expect(on.some(p => p.copyKey === 'ovulation')).toBe(true);
    expect(on.some(p => p.copyKey === 'fertileStart')).toBe(true);

    const hidden = planNotifications(S({ ovulation: true, fertileWindow: true }), cycles, true, 28, now);
    expect(hidden.some(p => p.copyKey === 'ovulation')).toBe(false);
    expect(hidden.some(p => p.copyKey === 'fertileStart')).toBe(false);
  });

  it('drops datetimes already in the past', () => {
    // now = 2026-06-28: a 2-day lead before the 06-29 start lands on 06-27 (past).
    const late = new Date(2026, 5, 28, 12, 0, 0);
    vi.setSystemTime(late);
    const plan = planNotifications(S({ leadDays: [2], periodStartConfirm: false }), cycles, false, 28, late);
    expect(plan.every(p => p.at.getTime() > late.getTime())).toBe(true);
    // Cycle 0's 2-day lead (06-27) is in the past and dropped; cycle 1's (07-25) survives.
    const upcoming = plan.filter(p => p.copyKey === 'upcoming');
    expect(upcoming.length).toBe(1);
    expect(upcoming[0].at.getMonth()).toBe(6); // July
  });

  it('schedules the active-cycle "did it end?" reminder', () => {
    const active: Cycle[] = [{ start: '2026-06-18', end: null }];
    const plan = planNotifications(S({ endReminderDay: 7 }), active, false, 28, now);
    const end = plan.find(p => p.copyKey === 'endConfirm');
    expect(end).toBeTruthy();
    // endReminderDay 7 → cycle day 7 = start + 6 days = 2026-06-24
    expect(end!.at.getFullYear()).toBe(2026);
    expect(end!.at.getMonth()).toBe(5);
    expect(end!.at.getDate()).toBe(24);
  });

  it('attaches the Yes/No action type to the start-confirm notification', () => {
    const plan = planNotifications(S(), cycles, false, 28, now);
    const confirm = plan.find(p => p.copyKey === 'startConfirm');
    expect(confirm?.actionTypeId).toBe('PERIOD_START_CONFIRM');
    expect(confirm?.extra?.predictedStart).toBe('2026-06-29');
  });
});
