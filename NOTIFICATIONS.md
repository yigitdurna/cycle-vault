# cycle vault — Local Notification System Spec

Privacy-first, on-device notification scheduling for the iOS app (Capacitor 8).
**No server, no push.** Everything is computed locally from the prediction engine
(`src/lib/cycle-math.ts`) and scheduled with `@capacitor/local-notifications` v8.

This document is implementation-ready: the API signatures below are verified against
the current Capacitor v8 plugin (see [§4](#4-verified-capacitorlocal-notifications-v8-api)).

---

## 0. Design principles

- **Local only.** All datetimes are derived from `getNextPeriodDate()` / `getPhaseForDate()`.
  No data ever leaves the device. Notification copy must not include sensitive specifics
  beyond what the user already sees in-app (and the app is already a known PWA on their device).
- **Toggleable.** Every notification type has its own enable flag with a sensible default.
- **Respect `hideFertility`.** When the existing `hideFertility` setting is on, the
  ovulation and fertile-window notifications are suppressed unconditionally, regardless
  of their own enable flags.
- **Rolling window.** iOS allows only ~64 pending local notifications per app. We schedule
  the next **2 cycles** and reschedule on every meaningful change.
- **Cancel-all then re-add.** We never try to diff. On any trigger we
  `cancel(getPending())` (or cancel our known ID range) and re-`schedule()` the whole set.
- **Graceful web fallback.** On the web (PWA / `npm run dev`), the native plugin is a no-op
  stub. We detect `Capacitor.isNativePlatform()` and either no-op or use the Web
  Notifications API (best-effort, see [§5](#5-web--no-capacitor-fallback)).

---

## 1. Notification types

All times fire at the user-selected **reminder time** (`reminderTime`, default `09:00`
local). Each type is individually toggleable.

| # | Type | Key | Default | Fires | hideFertility? |
|---|------|-----|---------|-------|----------------|
| 1 | Upcoming period reminder | `upcomingPeriod` | **on**, leadDays `[2]` | N days before predicted start (multi-select among 1/2/3/5/7) | — |
| 2 | Period start-day reminder | `periodStartDay` | **on** | morning of predicted start date | — |
| 3 | "Did your period start?" follow-up | `periodStartConfirm` | **on** | predicted start **+1 day**, only if no active cycle logged | — |
| 4 | "Did your period end?" reminder | `periodEndConfirm` | **on**, after `endReminderDay` = 7 | day N of an active (open-ended) cycle | — |
| 5 | Ovulation-day reminder | `ovulation` | **off** | predicted ovulation day | **suppressed** |
| 6 | Fertile-window-start reminder | `fertileWindow` | **off** | first day of predicted fertile window | **suppressed** |
| 7 | Phase-based wellness tips | `wellnessTips` | **off** | once per phase entry (menstrual rest tip, fertile note) | fertile tip suppressed |

### Details per type

1. **Upcoming period reminder** — For each value in `leadDays`, schedule one notification
   `leadDay` days before `getNextPeriodDate().date` at `reminderTime`. e.g. leadDays `[3,1]`
   produces two reminders. Skip any computed datetime already in the past.

2. **Period start-day reminder** — One notification on `getNextPeriodDate().date` at
   `reminderTime`. Copy is soft ("may start today") because prediction is probabilistic.

3. **"Did your period start?" confirmation** — Fires `predictedStart + 1 day`. At schedule
   time we cannot know the future "is there an active cycle" state, so we schedule it
   unconditionally **but** the reschedule-on-foreground logic ([§3.4](#34-reschedule-triggers))
   cancels/skips it the moment an active cycle exists whose start ≈ the prediction. Uses
   **interactive actions** (Yes / No) — see [§4.4](#44-action-types-yesno-on-the-did-it-start-prompt).
   - "Yes" → deep-links to log start (or, if action handling is wired, calls `addCycle(start, null)`).
   - "No" → reschedules a single follow-up +2 days (handled in the foreground listener).

4. **"Did your period end?" reminder** — Only relevant when `activeCycle` exists
   (`end === null`). Fires on day `endReminderDay` of that cycle
   (`activeCycle.start + endReminderDay days`). Reminds the user to close the cycle so
   stats stay accurate. Recomputed whenever `activeCycle` changes.

5. **Ovulation-day reminder** — Predicted ovulation ≈ cycle day `med − 14` … `med − 12`
   (matches `cycle-math` ovulation band). We use **`med − 13`** (band midpoint) as the
   single ovulation datetime. Suppressed entirely when `hideFertility` is true.

6. **Fertile-window-start reminder** — `fertileStart = max(periodLen + 1, med − 16)` cycle
   day (identical to `getPhaseForDate`'s formula). Suppressed when `hideFertility`.

7. **Phase-based wellness tips** — Gentle, low-frequency. At most one tip per phase entry:
   - Menstrual phase (day 1): rest/self-care tip.
   - Fertile phase start: neutral informational note (suppressed if `hideFertility`).
   Opt-in (`off` by default). These reuse the phase-start datetimes already computed for
   types 1–6 to avoid extra slots.

---

## 2. Settings schema

Extends the existing `Settings` interface in `src/hooks/useSettings.ts` (same localStorage
persistence pattern, key `cycle-tracker-settings-v1`). `NotificationSettings` is nested
under a `notifications` key so the existing flat fields (`customCycleLength`, `hideFertility`)
are untouched.

```typescript
// src/types.ts (or co-located with useSettings)

/** Days-before-period options the user may multi-select. */
export type LeadDay = 1 | 2 | 3 | 5 | 7;

export interface NotificationSettings {
  /** Master switch. If false, scheduleAllNotifications() cancels everything and returns. */
  enabled: boolean;

  /** "HH:MM" 24h local time all reminders fire at. */
  reminderTime: string;

  // --- per-type enable flags ---
  upcomingPeriod: boolean;
  periodStartDay: boolean;
  periodStartConfirm: boolean;
  periodEndConfirm: boolean;
  ovulation: boolean;
  fertileWindow: boolean;
  wellnessTips: boolean;

  // --- parameters ---
  /** Lead times for the upcoming-period reminder (type 1). Sorted desc on save. */
  leadDays: LeadDay[];
  /** Day-of-cycle the "did it end?" reminder fires (type 4). */
  endReminderDay: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,          // opt-in: stays off until the user enables + grants permission
  reminderTime: '09:00',
  upcomingPeriod: true,
  periodStartDay: true,
  periodStartConfirm: true,
  periodEndConfirm: true,
  ovulation: false,        // off so default install is fertility-neutral
  fertileWindow: false,
  wellnessTips: false,
  leadDays: [2],
  endReminderDay: 7,
};
```

Wire into `useSettings` exactly like the existing fields:

```typescript
interface Settings {
  customCycleLength?: number;
  hideFertility?: boolean;
  notifications?: NotificationSettings;   // <-- new
}

// in useSettings():
notifications: settings.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
setNotifications: (patch: Partial<NotificationSettings>) =>
  updateSettings({
    notifications: { ...(settings.notifications ?? DEFAULT_NOTIFICATION_SETTINGS), ...patch },
  }),
```

> Note (project convention): the reminder-time picker should keep its value in **local
> string state and only commit on Save/blur** — never clamp/commit on every keystroke.

---

## 3. Scheduling algorithm

Lives in a new module `src/lib/notifications.ts` (pure compute) +
`src/hooks/useNotifications.ts` (effects, listeners, permission flow). Compute is kept
pure and **unit-testable** the same way `cycle-math` / `insights` are.

### 3.1 ID allocation (deterministic, 32-bit)

Notification `id` must be a 32-bit integer. We use a deterministic scheme so a re-schedule
of the same logical event reuses the same id (and so we know our own range for bulk cancel):

```
id = TYPE_BASE[type] + cycleIndex * 100 + paramIndex
```

- `TYPE_BASE` are spaced constants (e.g. `upcomingPeriod: 1_000_000`,
  `periodStartDay: 2_000_000`, `periodStartConfirm: 3_000_000`,
  `periodEndConfirm: 4_000_000`, `ovulation: 5_000_000`, `fertileWindow: 6_000_000`,
  `wellnessTips: 7_000_000`).
- `cycleIndex` ∈ {0, 1} (current + next predicted cycle).
- `paramIndex` distinguishes lead-time entries (index into `leadDays`) or phase variants.

All allocated ids stay well under `2_147_483_647`. Because the scheme is closed and known,
we can cancel our entire footprint without relying on `getPending()`.

### 3.2 Computing concrete datetimes

Given `cycles: Cycle[]` and `settings`, build a list of `{ id, type, at: Date, copyKey, args }`:

1. Derive `med` via `getCycleStats(cycles, customCycleLength ?? 28)`.
2. `next = getNextPeriodDate(cycles, defaultLen)`. If null (no data) → schedule nothing
   except possibly the active-cycle "did it end?" reminder.
3. For `cycleIndex` 0 and 1, compute the predicted start of that cycle
   (`cycleIndex === 0` → `next.date`; `cycleIndex === 1` → `next.date + med days`).
   For each predicted start:
   - **Upcoming**: for each `leadDay` → `start − leadDay days`.
   - **Start-day**: `start`.
   - **Start-confirm**: `start + 1 day`.
   - **Ovulation** (unless `hideFertility`): anchor cycle start `+ (med − 13 − 1)` days.
   - **Fertile start** (unless `hideFertility`): anchor `+ (fertileStart − 1)` days,
     `fertileStart = max(periodLen + 1, med − 16)`.
   - **Wellness tips** (if on): reuse start (menstrual) and fertile-start (fertile) dates.
4. **Active-cycle "did it end?"** (independent of prediction): if `activeCycle` exists,
   `activeCycle.start + endReminderDay days`.
5. Apply `reminderTime`: set each `Date`'s hours/minutes from `"HH:MM"`.
   (Use the noon-safe construction style of `cycle-math` to avoid DST edge cases, then
   overwrite hours/minutes.)
6. **Drop any `at <= now`.** Past datetimes are never scheduled.
7. **Cap at 64.** Sort ascending by `at`, slice to the soonest 60 (headroom buffer below
   the iOS ~64 ceiling). With 2 cycles × ~8 events this stays comfortably under, but the
   slice is a hard safety net.

### 3.3 The ~64 pending-notification cap

iOS silently drops scheduled notifications beyond ~64 pending per app (OS-level limit, not
documented by Capacitor). Mitigations, all applied:

- Rolling window of **2 cycles only** (never schedule months ahead).
- Hard `slice(0, 60)` after sorting by soonest datetime.
- Reschedule on app foreground (§3.4) so the window keeps sliding forward as time passes
  and as the soonest notifications fire.

### 3.4 Reschedule triggers

Always **cancel-all then re-add** (no diffing). Note `cancel()` only removes *pending*
notifications — ones iOS has already **delivered** stay tappable in Notification Center
(this let a stale "did your period start?" prompt be tapped a day after the user logged
the period). So the cancel step also calls `removeAllDeliveredNotifications()`.
Trigger a full `scheduleAllNotifications`:

1. **Settings change** — any toggle, `reminderTime`, `leadDays`, `endReminderDay`, or
   `hideFertility`.
2. **Cycle data change** — `addCycle`, `endCycle`, `updateCycle`, `deleteCycle`,
   `clearAll`, and after import (CSV/JSON). Hook this off the same `cycles` dependency the
   computed values use.
3. **App foreground** — listen to `App.addListener('appStateChange', ...)` from
   `@capacitor/app`; on `isActive === true`, reschedule. This slides the window forward and
   also resolves the type-3 "did it start?" suppression (if an active cycle now exists near
   the prediction, the re-compute simply omits it).

### 3.5 Permission flow

```
on enable toggle (user turns notifications on):
  perm = await LocalNotifications.checkPermissions()
  if perm.display === 'prompt' | 'prompt-with-rationale':
       perm = await LocalNotifications.requestPermissions()
  if perm.display === 'granted':
       settings.enabled = true; scheduleAllNotifications()
  else // 'denied'
       settings.enabled = false
       show in-app explainer: "Notifications are blocked. Enable them in
       iOS Settings → cycle vault → Notifications." (deep-link optional)
```

- Never request on app launch — only when the user opts in (respects privacy-first ethos).
- If `enabled` is true on launch but permission was later revoked in iOS Settings,
  `requestPermissions` won't re-prompt (iOS shows denied); the next schedule is a no-op and
  the settings UI should reflect the revoked state via `checkPermissions()`.

---

## 4. Verified `@capacitor/local-notifications` v8 API

> Verified against the current Capacitor v8 plugin docs
> (`capacitorjs.com/docs/apis/local-notifications`) and plugin README, June 2026.
> The iOS ~64 pending limit is an **OS** constraint and is **not** documented by Capacitor —
> we handle it ourselves (§3.3).

### 4.1 Method signatures

```typescript
import { LocalNotifications } from '@capacitor/local-notifications';

LocalNotifications.schedule(options: ScheduleOptions): Promise<ScheduleResult>;
LocalNotifications.requestPermissions(): Promise<PermissionStatus>;
LocalNotifications.checkPermissions(): Promise<PermissionStatus>;
LocalNotifications.cancel(options: CancelOptions): Promise<void>;
LocalNotifications.getPending(): Promise<PendingResult>;
LocalNotifications.registerActionTypes(options: RegisterActionTypesOptions): Promise<void>;
LocalNotifications.addListener(
  eventName: 'localNotificationActionPerformed',
  listenerFunc: (action: ActionPerformed) => void,
): Promise<PluginListenerHandle>;
```

### 4.2 Key types

```typescript
interface ScheduleOptions { notifications: LocalNotificationSchema[]; }
interface ScheduleResult  { notifications: { id: number }[]; }
interface CancelOptions   { notifications: { id: number }[]; }
interface PendingResult   { notifications: PendingLocalNotificationSchema[]; }

interface LocalNotificationSchema {
  id: number;            // REQUIRED, 32-bit int (-2147483648 .. 2147483647)
  title: string;
  body: string;
  schedule?: Schedule;
  actionTypeId?: string; // ties to a registered ActionType (for Yes/No buttons)
  extra?: any;           // round-tripped to the action listener
  sound?: string;
  smallIcon?: string;    // Android-only
  iconColor?: string;    // Android-only
  // ...channelId, ongoing, autoCancel are Android-only
}

interface Schedule {
  at?: Date;             // one-shot at a specific datetime  <-- what we use
  repeats?: boolean;
  every?: ScheduleEvery; // 'year'|'month'|'two-weeks'|'week'|'day'|'hour'|'minute'|'second'
  allowWhileIdle?: boolean;
}

interface RegisterActionTypesOptions { types: ActionType[]; }
interface ActionType { id: string; actions: Action[]; }
interface Action {
  id: string;
  title: string;
  requiresAuthentication?: boolean; // iOS
  foreground?: boolean;             // iOS
  destructive?: boolean;            // iOS
}

interface PermissionStatus { display: PermissionState; } // 'prompt'|'prompt-with-rationale'|'granted'|'denied'
interface ActionPerformed {
  actionId: string;            // e.g. 'YES' | 'NO' | 'tap'
  notification: LocalNotificationSchema; // includes our extra
}
```

### 4.3 Bulk-cancel helper

```typescript
async function cancelAll(): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map(n => ({ id: n.id })),
    });
  }
}
```

### 4.4 Action types (Yes/No on the "did it start?" prompt)

Register once at app init (after native ready):

```typescript
await LocalNotifications.registerActionTypes({
  types: [{
    id: 'PERIOD_START_CONFIRM',
    actions: [
      { id: 'YES', title: 'Yes, log it', foreground: true },
      { id: 'NO',  title: 'Not yet' },
    ],
  }],
});

LocalNotifications.addListener('localNotificationActionPerformed', ({ actionId, notification }) => {
  if (notification.actionTypeId !== 'PERIOD_START_CONFIRM') return;
  if (actionId === 'YES') {
    // notification.extra.predictedStart carries the date
    // deep-link to LogPeriodSheet 'start' mode, or addCycle(extra.predictedStart, null)
  } else if (actionId === 'NO') {
    // optionally schedule one more follow-up +2 days
  }
});
```

### 4.5 Code sketch — `scheduleAllNotifications(settings, cycles)`

```typescript
// src/lib/notifications.ts  (compute is pure; I/O lives in the hook)
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { addDays, fromYmd, ymd, diff, getNextPeriodDate, getCycleStats } from './cycle-math';
import type { Cycle } from '../types';
import type { NotificationSettings } from '../types';

const TYPE_BASE = {
  upcomingPeriod: 1_000_000, periodStartDay: 2_000_000, periodStartConfirm: 3_000_000,
  periodEndConfirm: 4_000_000, ovulation: 5_000_000, fertileWindow: 6_000_000,
  wellnessTips: 7_000_000,
} as const;

/** "HH:MM" applied onto a date, noon-safe construction then override H/M. */
function atTime(d: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
}

export interface PlannedNotification {
  id: number; copyKey: string; args: Record<string, unknown>;
  at: Date; actionTypeId?: string; extra?: Record<string, unknown>;
}

/** PURE: compute the full set of notifications to schedule. Unit-testable. */
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
      const periodLen = 5; // mirror cycle-math default; refine from anchor if available

      if (settings.upcomingPeriod) {
        settings.leadDays.forEach((lead, pi) => {
          out.push({ id: TYPE_BASE.upcomingPeriod + ci * 100 + pi,
            copyKey: 'notif.upcoming', args: { days: lead },
            at: atTime(addDays(start, -lead), settings.reminderTime) });
        });
      }
      if (settings.periodStartDay) {
        out.push({ id: TYPE_BASE.periodStartDay + ci * 100, copyKey: 'notif.startDay',
          args: {}, at: atTime(start, settings.reminderTime) });
      }
      if (settings.periodStartConfirm) {
        out.push({ id: TYPE_BASE.periodStartConfirm + ci * 100, copyKey: 'notif.startConfirm',
          args: {}, at: atTime(addDays(start, 1), settings.reminderTime),
          actionTypeId: 'PERIOD_START_CONFIRM', extra: { predictedStart: startStr } });
      }
      if (settings.ovulation && !hideFertility) {
        out.push({ id: TYPE_BASE.ovulation + ci * 100, copyKey: 'notif.ovulation',
          args: {}, at: atTime(addDays(start, med - 13 - 1), settings.reminderTime) });
      }
      if (settings.fertileWindow && !hideFertility) {
        const fertileStart = Math.max(periodLen + 1, med - 16);
        out.push({ id: TYPE_BASE.fertileWindow + ci * 100, copyKey: 'notif.fertileStart',
          args: {}, at: atTime(addDays(start, fertileStart - 1), settings.reminderTime) });
      }
      if (settings.wellnessTips) {
        out.push({ id: TYPE_BASE.wellnessTips + ci * 100, copyKey: 'notif.tip.menstrual',
          args: {}, at: atTime(start, settings.reminderTime) });
        if (!hideFertility) {
          const fertileStart = Math.max(periodLen + 1, med - 16);
          out.push({ id: TYPE_BASE.wellnessTips + ci * 100 + 1, copyKey: 'notif.tip.fertile',
            args: {}, at: atTime(addDays(start, fertileStart - 1), settings.reminderTime) });
        }
      }
    }
  }

  // Active-cycle "did it end?" (prediction-independent)
  const active = cycles.find(c => c.end === null);
  if (settings.periodEndConfirm && active) {
    out.push({ id: TYPE_BASE.periodEndConfirm, copyKey: 'notif.endConfirm',
      args: { day: settings.endReminderDay },
      at: atTime(addDays(fromYmd(active.start), settings.endReminderDay), settings.reminderTime) });
  }

  // Drop past, sort soonest-first, cap under the iOS 64 ceiling.
  return out.filter(n => n.at.getTime() > now.getTime())
            .sort((a, b) => a.at.getTime() - b.at.getTime())
            .slice(0, 60);
}

/** I/O wrapper: cancel-all then re-add. t() is the i18n translator. */
export async function scheduleAllNotifications(
  settings: NotificationSettings, cycles: Cycle[], hideFertility: boolean,
  defaultLen: number, t: (key: string, args?: Record<string, unknown>) => string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return; // web fallback handled elsewhere (§5)

  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') return;

  // cancel-all
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) });
  }
  if (!settings.enabled) return;

  const planned = planNotifications(settings, cycles, hideFertility, defaultLen);
  if (!planned.length) return;

  const notifications: LocalNotificationSchema[] = planned.map(p => ({
    id: p.id,
    title: t(p.copyKey + '.title', p.args),
    body: t(p.copyKey + '.body', p.args),
    schedule: { at: p.at, allowWhileIdle: true },
    ...(p.actionTypeId ? { actionTypeId: p.actionTypeId } : {}),
    ...(p.extra ? { extra: p.extra } : {}),
  }));

  await LocalNotifications.schedule({ notifications });
}
```

---

## 5. Web / no-Capacitor fallback

The app runs in the browser (PWA, `npm run dev`, GitHub Pages). The native plugin is a
non-notifying stub on web. Strategy:

- **Guard every native call** with `Capacitor.isNativePlatform()`. On web,
  `scheduleAllNotifications` returns early (graceful no-op) — the app keeps working, the
  Settings UI shows a "Notifications are only available in the installed app" note.
- **Optional best-effort Web Notifications:** browsers cannot schedule notifications for a
  future datetime while closed (no on-device scheduler without a backend/push). So a true
  web equivalent is not possible privacy-first. If desired, we can show an *immediate*
  Web Notification (`new Notification(...)` after `Notification.requestPermission()`) only
  while the tab is open and a reminder is due "today" — but this is cosmetic and should be
  clearly secondary. Recommended default: **no-op on web**, full functionality native only.
- No crashes: importing `@capacitor/local-notifications` is safe on web; only the method
  behavior differs. Never assume `getPending()` returns scheduled items on web.

---

## 6. i18n — notification message keys

All copy must be localizable (en / tr / de). Keys live in the existing i18n catalogs under
a `notif.` namespace. Each notification uses `.title` and `.body`; some interpolate args
(`{days}`, `{day}`). Action button titles are also localized.

| Key | Args | English (reference) |
|-----|------|---------------------|
| `notif.upcoming.title` | — | "Period coming up" |
| `notif.upcoming.body` | `{days}` | "Your period may start in {days} day(s)." |
| `notif.startDay.title` | — | "Period may start today" |
| `notif.startDay.body` | — | "Today is your predicted start day." |
| `notif.startConfirm.title` | — | "Did your period start?" |
| `notif.startConfirm.body` | — | "Tap to log it so your predictions stay accurate." |
| `notif.endConfirm.title` | — | "Did your period end?" |
| `notif.endConfirm.body` | `{day}` | "You've been logged for {day} days — don't forget to log the end." |
| `notif.ovulation.title` | — | "Ovulation day" |
| `notif.ovulation.body` | — | "Today is your predicted ovulation day." |
| `notif.fertileStart.title` | — | "Fertile window starting" |
| `notif.fertileStart.body` | — | "Your predicted fertile window begins today." |
| `notif.tip.menstrual.title` | — | "Be kind to yourself" |
| `notif.tip.menstrual.body` | — | "Menstrual phase — rest and hydration help. Listen to your body." |
| `notif.tip.fertile.title` | — | "Fertile phase" |
| `notif.tip.fertile.body` | — | "You're entering your fertile phase." |
| `notif.action.yes` | — | "Yes, log it" |
| `notif.action.no` | — | "Not yet" |
| `notif.permissionDenied` | — | "Notifications are blocked. Enable them in iOS Settings → cycle vault." |
| `notif.webUnavailable` | — | "Notifications are only available in the installed app." |

> Brand rule: any user-facing app name in copy is always lowercase **"cycle vault"**.
> Tone: gentle and non-deterministic ("may start", "predicted") because calendar-only
> prediction is ~21% accurate for ovulation (per `cycle-math` evidence basis).

---

## 7. Implementation checklist

- [ ] `npm i @capacitor/local-notifications @capacitor/app` (Capacitor 8 compatible majors).
- [ ] Add `NotificationSettings` + `DEFAULT_NOTIFICATION_SETTINGS` to `src/types.ts`.
- [ ] Extend `useSettings` with `notifications` + `setNotifications` (§2).
- [ ] `src/lib/notifications.ts` — pure `planNotifications` + `scheduleAllNotifications`.
- [ ] `src/lib/__tests__/notifications.test.ts` — unit tests for `planNotifications`
      (lead-time fan-out, hideFertility suppression, past-drop, 60-cap, active-cycle end
      reminder, no-data case). Follow the existing `cycle-math` test style.
- [ ] `src/hooks/useNotifications.ts` — permission flow, `registerActionTypes`, the
      `localNotificationActionPerformed` + `appStateChange` listeners, and an effect that
      reschedules whenever `cycles` / `notifications` settings / `hideFertility` change.
- [ ] Settings UI: master toggle (triggers permission flow), per-type switches, lead-day
      multi-select, reminder-time picker (commit on Save/blur), end-reminder-day input.
- [ ] Add `notif.*` keys to en / tr / de catalogs.
- [ ] Web guard verified: app runs in browser with notifications no-op'd.
```
