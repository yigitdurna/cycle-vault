/**
 * Local notification planning + scheduling. Privacy-first: everything is
 * computed on-device from the prediction engine and scheduled with
 * @capacitor/local-notifications. No server, no push.
 *
 * `planNotifications` is PURE and unit-tested. `scheduleAllNotifications` does
 * the native I/O and is a no-op on web (guarded by Capacitor.isNativePlatform).
 */
import { addDays, fromYmd, ymd, getNextPeriodDate, getCycleStats } from './cycle-math';
import type { Cycle, NotificationSettings } from '../types';

const TYPE_BASE = {
  upcomingPeriod: 1_000_000,
  periodStartDay: 2_000_000,
  periodStartConfirm: 3_000_000,
  periodEndConfirm: 4_000_000,
  ovulation: 5_000_000,
  fertileWindow: 6_000_000,
  wellnessTips: 7_000_000,
  duringPeriod: 8_000_000,
} as const;

const PERIOD_LEN_DEFAULT = 5;
const MAX_PENDING = 60; // safety net under the iOS ~64 ceiling

export interface PlannedNotification {
  id: number;
  copyKey: string;
  args: Record<string, number | string>;
  at: Date;
  actionTypeId?: string;
  extra?: Record<string, unknown>;
}

/** "HH:MM" applied onto a date (local), keeping the calendar day. */
function atTime(d: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0, 0, 0);
}

/**
 * PURE: compute the full set of notifications to schedule for the next two
 * predicted cycles plus the active-cycle "did it end?" reminder. Drops
 * past datetimes, sorts soonest-first, caps under the iOS pending limit.
 */
export function planNotifications(
  settings: NotificationSettings,
  cycles: Cycle[],
  hideFertility: boolean,
  defaultLen: number,
  now: Date = new Date(),
): PlannedNotification[] {
  if (!settings.enabled) return [];

  const out: PlannedNotification[] = [];
  const stats = getCycleStats(cycles, defaultLen);
  const next = getNextPeriodDate(cycles, defaultLen);

  if (stats && next) {
    const med = stats.med;
    for (let ci = 0; ci < 2; ci++) {
      const startStr = ci === 0 ? next.date : ymd(addDays(fromYmd(next.date), med));
      const start = fromYmd(startStr);
      const periodLen = PERIOD_LEN_DEFAULT;

      if (settings.upcomingPeriod) {
        settings.leadDays.forEach((lead, pi) => {
          out.push({
            id: TYPE_BASE.upcomingPeriod + ci * 100 + pi,
            copyKey: 'upcoming',
            args: { days: lead },
            at: atTime(addDays(start, -lead), settings.reminderTime),
          });
        });
      }
      if (settings.periodStartDay) {
        out.push({
          id: TYPE_BASE.periodStartDay + ci * 100,
          copyKey: 'startDay',
          args: {},
          at: atTime(start, settings.reminderTime),
        });
      }
      if (settings.periodStartConfirm) {
        out.push({
          id: TYPE_BASE.periodStartConfirm + ci * 100,
          copyKey: 'startConfirm',
          args: {},
          at: atTime(addDays(start, 1), settings.reminderTime),
          actionTypeId: 'PERIOD_START_CONFIRM',
          extra: { predictedStart: startStr },
        });
      }
      if (settings.ovulation && !hideFertility) {
        out.push({
          id: TYPE_BASE.ovulation + ci * 100,
          copyKey: 'ovulation',
          args: {},
          at: atTime(addDays(start, med - 13 - 1), settings.reminderTime),
        });
      }
      if (settings.fertileWindow && !hideFertility) {
        const fertileStart = Math.max(periodLen + 1, med - 16);
        out.push({
          id: TYPE_BASE.fertileWindow + ci * 100,
          copyKey: 'fertileStart',
          args: {},
          at: atTime(addDays(start, fertileStart - 1), settings.reminderTime),
        });
      }
      if (settings.wellnessTips) {
        out.push({
          id: TYPE_BASE.wellnessTips + ci * 100,
          copyKey: 'tipMenstrual',
          args: {},
          at: atTime(start, settings.reminderTime),
        });
        if (!hideFertility) {
          const fertileStart = Math.max(periodLen + 1, med - 16);
          out.push({
            id: TYPE_BASE.wellnessTips + ci * 100 + 1,
            copyKey: 'tipFertile',
            args: {},
            at: atTime(addDays(start, fertileStart - 1), settings.reminderTime),
          });
        }
      }
    }
  }

  // Active-cycle reminders (independent of prediction).
  const active = cycles.find(c => c.end === null);
  if (active) {
    // Daily "log your symptoms" nudge through the expected bleed days (2–5).
    if (settings.duringPeriod) {
      for (let day = 2; day <= PERIOD_LEN_DEFAULT; day++) {
        out.push({
          id: TYPE_BASE.duringPeriod + day,
          copyKey: 'duringPeriod',
          args: { day },
          at: atTime(addDays(fromYmd(active.start), day - 1), settings.reminderTime),
        });
      }
    }
    // "Did it end? Don't forget to log."
    if (settings.periodEndConfirm) {
      out.push({
        id: TYPE_BASE.periodEndConfirm,
        copyKey: 'endConfirm',
        args: { day: settings.endReminderDay },
        // Cycle day 1 is the start (offset 0), so day N is offset N-1. This
        // makes the fire date match the "It's been {day} days" copy.
        at: atTime(addDays(fromYmd(active.start), settings.endReminderDay - 1), settings.reminderTime),
      });
    }
  }

  return out
    .filter(n => n.at.getTime() > now.getTime())
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX_PENDING);
}

// --- Copy (English; localizable later via the i18n catalog) ---

const COPY: Record<string, { title: string; body: (a: Record<string, number | string>) => string }> = {
  upcoming: { title: 'Period coming up', body: a => `Your period may start in ${a.days} day${a.days === 1 ? '' : 's'}.` },
  startDay: { title: 'Period may start today', body: () => 'Today is your predicted start day.' },
  startConfirm: { title: 'Did your period start?', body: () => 'Tap to log it so your predictions stay accurate.' },
  duringPeriod: { title: 'How are you feeling?', body: () => 'Log today’s flow and symptoms while your period is on.' },
  endConfirm: { title: 'Did your period end?', body: a => `It's been ${a.day} days — don't forget to log the end.` },
  ovulation: { title: 'Ovulation day', body: () => 'Today is your predicted ovulation day.' },
  fertileStart: { title: 'Fertile window starting', body: () => 'Your predicted fertile window begins today.' },
  tipMenstrual: { title: 'Be kind to yourself', body: () => 'Menstrual phase — rest and hydration help. Listen to your body.' },
  tipFertile: { title: 'Fertile phase', body: () => "You're entering your fertile phase." },
};

/**
 * I/O wrapper: cancel-all then re-add. No-op on web. Safe to call any time —
 * checks permission and the master switch internally.
 */
export async function scheduleAllNotifications(
  settings: NotificationSettings,
  cycles: Cycle[],
  hideFertility: boolean,
  defaultLen: number,
): Promise<void> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return;

  const { LocalNotifications } = await import('@capacitor/local-notifications');

  // Cancel our entire footprint first.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }

  if (!settings.enabled) return;
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;

  const planned = planNotifications(settings, cycles, hideFertility, defaultLen);
  if (!planned.length) return;

  await LocalNotifications.schedule({
    notifications: planned.map(p => {
      const c = COPY[p.copyKey];
      return {
        id: p.id,
        title: c.title,
        body: c.body(p.args),
        schedule: { at: p.at, allowWhileIdle: true },
        ...(p.actionTypeId ? { actionTypeId: p.actionTypeId } : {}),
        ...(p.extra ? { extra: p.extra } : {}),
      };
    }),
  });
}

/**
 * Request OS permission for notifications (call from the enable toggle only).
 * Returns true if granted. No-op-safe on web (returns false).
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return false;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
    perm = await LocalNotifications.requestPermissions();
  }
  return perm.display === 'granted';
}
