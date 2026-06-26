import { useEffect, useRef } from 'react';
import { scheduleAllNotifications } from '../lib/notifications';
import type { Cycle, NotificationSettings } from '../types';

/**
 * Keeps on-device notifications in sync with cycles + settings. All native
 * calls are guarded (no-op on web). Reschedules whenever cycle data, the
 * notification settings, or hideFertility change, and on app foreground.
 *
 * @param onLogStart called when the user taps "Yes, log it" on a
 *        "did your period start?" notification (with the predicted start date).
 */
export function useNotifications(
  cycles: Cycle[],
  notifications: NotificationSettings,
  hideFertility: boolean,
  defaultLen: number,
  onLogStart: (startDate: string) => void,
) {
  const onLogStartRef = useRef(onLogStart);
  onLogStartRef.current = onLogStart;

  // One-time native setup: action buttons + listeners.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform() || cancelled) return;

      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const { App } = await import('@capacitor/app');

      await LocalNotifications.registerActionTypes({
        types: [{
          id: 'PERIOD_START_CONFIRM',
          actions: [
            { id: 'YES', title: 'Yes, log it', foreground: true },
            { id: 'NO', title: 'Not yet' },
          ],
        }],
      });

      const actionSub = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        ({ actionId, notification }) => {
          if (notification.actionTypeId !== 'PERIOD_START_CONFIRM') return;
          const start = (notification.extra as { predictedStart?: string } | undefined)?.predictedStart;
          if (actionId === 'YES' && start) onLogStartRef.current(start);
        },
      );

      // Reschedule on foreground so the rolling window slides forward.
      const appSub = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          scheduleAllNotifications(notificationsRef.current, cyclesRef.current, hideFertilityRef.current, defaultLenRef.current);
        }
      });

      cleanup = () => { actionSub.remove(); appSub.remove(); };
    })();

    return () => { cancelled = true; cleanup?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Latest values for the foreground listener (which is registered once).
  const cyclesRef = useRef(cycles); cyclesRef.current = cycles;
  const notificationsRef = useRef(notifications); notificationsRef.current = notifications;
  const hideFertilityRef = useRef(hideFertility); hideFertilityRef.current = hideFertility;
  const defaultLenRef = useRef(defaultLen); defaultLenRef.current = defaultLen;

  // Reschedule whenever the inputs change (cancel-all then re-add inside).
  useEffect(() => {
    scheduleAllNotifications(notifications, cycles, hideFertility, defaultLen);
  }, [cycles, notifications, hideFertility, defaultLen]);
}
