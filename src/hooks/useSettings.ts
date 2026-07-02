import { useState } from 'react';
import type { NotificationSettings } from '../types';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../types';
import { detectLocale, isLocale, type Locale } from '../i18n';
import { mirrorToDurable } from '../lib/durable-storage';

const STORAGE_KEY = 'cycle-tracker-settings-v1';

interface Settings {
  customCycleLength?: number;
  /** Childfree / not-trying-to-conceive mode: hides fertile-window and
   *  ovulation predictions throughout the app. Off by default. */
  hideFertility?: boolean;
  notifications?: NotificationSettings;
  /** UI language. Defaults to navigator.language on first run. */
  locale?: Locale;
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
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(STORAGE_KEY, serialized);
      mirrorToDurable(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn('Failed to persist settings to localStorage', e);
    }
  };

  return {
    customCycleLength: settings.customCycleLength,
    setCustomCycleLength: (v: number | undefined) =>
      updateSettings({ customCycleLength: v }),
    hideFertility: settings.hideFertility ?? false,
    setHideFertility: (v: boolean) => updateSettings({ hideFertility: v }),
    locale: isLocale(settings.locale) ? settings.locale : detectLocale(),
    setLocale: (v: Locale) => updateSettings({ locale: v }),
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notifications },
    setNotifications: (patch: Partial<NotificationSettings>) =>
      updateSettings({
        notifications: { ...DEFAULT_NOTIFICATION_SETTINGS, ...settings.notifications, ...patch },
      }),
  };
}
