import { useState } from 'react';
import type { NotificationSettings } from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../types';

const STORAGE_KEY = 'cycle-tracker-settings-v1';

interface Settings {
  customCycleLength?: number;
  /** Childfree / not-trying-to-conceive mode: hides fertile-window and
   *  ovulation predictions throughout the app. Off by default. */
  hideFertility?: boolean;
  notifications?: NotificationSettings;
}

function loadSettings(): Settings {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  return {
    customCycleLength: settings.customCycleLength,
    setCustomCycleLength: (v: number | undefined) =>
      updateSettings({ customCycleLength: v }),
    hideFertility: settings.hideFertility ?? false,
    setHideFertility: (v: boolean) => updateSettings({ hideFertility: v }),
    notifications: settings.notifications ?? DEFAULT_NOTIFICATION_SETTINGS,
    setNotifications: (patch: Partial<NotificationSettings>) =>
      updateSettings({
        notifications: { ...(settings.notifications ?? DEFAULT_NOTIFICATION_SETTINGS), ...patch },
      }),
  };
}
