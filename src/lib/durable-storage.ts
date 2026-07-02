/**
 * Durable native mirror of the app's localStorage. iOS can purge WKWebView
 * localStorage under storage pressure; Capacitor Preferences is UserDefaults-
 * backed, never purged, and included in device backups. localStorage stays the
 * synchronous runtime store (hooks read it at init); this module write-through-
 * mirrors every save and, once at boot, restores the mirror if localStorage was
 * wiped.
 *
 * The per-key decision (`decideHydration`) is PURE and unit-tested. The I/O
 * (`mirrorToDurable`, `hydrateFromDurable`) is a no-op on web, guarded by
 * Capacitor.isNativePlatform via dynamic import — same style as notifications.ts.
 */

export const DURABLE_KEYS = [
  'cycle-tracker-calendar-v4',
  'cycle-tracker-daylogs-v1',
  'cycle-tracker-settings-v1',
] as const;

export type HydrationAction = 'push' | 'restore' | 'none';

/**
 * PURE: decide what to do for one key given the current localStorage value and
 * the durable (Preferences) value.
 * - localStorage present  → 'push' (localStorage is fresher; every save writes
 *   through, so this also migrates existing users whose data was never mirrored)
 * - localStorage empty/null but durable present → 'restore' (purge recovery)
 * - both empty → 'none'
 * A value counts as "present" only if it's a non-empty string.
 */
export function decideHydration(
  localValue: string | null,
  durableValue: string | null,
): HydrationAction {
  const hasLocal = typeof localValue === 'string' && localValue.length > 0;
  if (hasLocal) return 'push';
  const hasDurable = typeof durableValue === 'string' && durableValue.length > 0;
  if (hasDurable) return 'restore';
  return 'none';
}

/**
 * Fire-and-forget write-through of one key to Preferences. No-op on web.
 * Never throws synchronously (async work runs detached; errors are swallowed
 * and warned, like the localStorage save catches).
 */
export function mirrorToDurable(key: string, value: string): void {
  void (async () => {
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      const { Preferences } = await import('@capacitor/preferences');
      await Preferences.set({ key, value });
    } catch (e) {
      console.warn('Failed to mirror to durable storage', key, e);
    }
  })();
}

/**
 * Called ONCE at boot, BEFORE React renders. Reconciles each durable key
 * between localStorage and Preferences per `decideHydration`. No-op on web
 * (resolves immediately).
 */
export async function hydrateFromDurable(): Promise<void> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Preferences } = await import('@capacitor/preferences');

    for (const key of DURABLE_KEYS) {
      const localValue = localStorage.getItem(key);
      const { value: durableValue } = await Preferences.get({ key });
      const action = decideHydration(localValue, durableValue);
      if (action === 'push') {
        // localStorage wins; ensure the mirror matches (one-time migration too).
        await Preferences.set({ key, value: localValue as string });
      } else if (action === 'restore') {
        localStorage.setItem(key, durableValue as string);
      }
    }
  } catch (e) {
    console.warn('Failed to hydrate from durable storage', e);
  }
}
