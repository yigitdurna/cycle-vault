/**
 * i18n runtime for cycle vault.
 *
 * - `createTranslator(locale)` returns a `t(key, args?)` that looks the key up
 *   in the catalog (translations.ts), interpolates `{placeholder}` tokens and
 *   resolves plurals.
 * - Plurals: when `args.count` is set and the exact key is missing, `t` falls
 *   back to `<key>One` / `<key>Other`. English & German pick `One` for count 1,
 *   `Other` otherwise. Turkish has no numeral plural, so its `One`/`Other`
 *   entries are identical and either resolves to the same string.
 * - The locale is provided to the React tree via `LocaleContext`; components
 *   read it with `useTranslation()`. Pure libs (insights, notifications) accept
 *   a translator argument, defaulting to the English `defaultT`.
 */
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { translations, type Locale } from './translations';

export type { Locale } from './translations';

export type TArgs = Record<string, string | number>;
export type TFunc = (key: string, args?: TArgs) => string;

const LOCALES: Locale[] = ['en', 'tr', 'de'];

/** Resolve a "group.leaf" key to the string for `locale`, or undefined. */
function lookup(locale: Locale, key: string): string | undefined {
  const dot = key.indexOf('.');
  if (dot === -1) return undefined;
  const group = key.slice(0, dot);
  const leaf = key.slice(dot + 1);
  const groupObj = (translations as Record<string, Record<string, Record<Locale, string>>>)[group];
  const entry = groupObj?.[leaf];
  return entry?.[locale];
}

/** Replace {name} tokens with the matching arg value. */
function interpolate(template: string, args?: TArgs): string {
  if (!args) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name) =>
    name in args ? String(args[name]) : whole,
  );
}

export function createTranslator(locale: Locale): TFunc {
  return (key, args) => {
    let template = lookup(locale, key);

    // Plural fallback: <key>One / <key>Other selected by args.count.
    if (template === undefined && args && typeof args.count === 'number') {
      const form = args.count === 1 ? 'One' : 'Other';
      template = lookup(locale, key + form);
    }

    if (template === undefined) return key; // visible-but-safe fallback
    return interpolate(template, args);
  };
}

/** English translator for pure libs and as the context default. */
export const defaultT: TFunc = createTranslator('en');

interface LocaleContextValue {
  locale: Locale;
  t: TFunc;
}

export const LocaleContext = createContext<LocaleContextValue>({ locale: 'en', t: defaultT });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const t = createTranslator(locale);
  return <LocaleContext.Provider value={{ locale, t }}>{children}</LocaleContext.Provider>;
}

export function useTranslation(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Detect a sensible default locale from the browser on first run. */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  const lang = (navigator.language || '').toLowerCase();
  if (lang.startsWith('tr')) return 'tr';
  if (lang.startsWith('de')) return 'de';
  return 'en';
}

export function isLocale(v: unknown): v is Locale {
  return typeof v === 'string' && (LOCALES as string[]).includes(v);
}

/** Endonyms shown in the language selector (never translated). */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  de: 'Deutsch',
};

// --- Shared helpers for localized phase names + list joining ---

import type { CyclePhase } from '../types';

/** Map a UI phase name to its lowercase catalog leaf ('Menstrual' → 'menstrual'). */
export function phaseKey(phase: CyclePhase): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' {
  switch (phase) {
    case 'Menstrual': return 'menstrual';
    case 'Follicular': return 'follicular';
    case 'Ovulation': return 'ovulation';
    case 'Luteal': return 'luteal';
  }
}

/** Localized phase display name. */
export function phaseName(t: TFunc, phase: CyclePhase): string {
  return t(`phases.${phaseKey(phase)}`);
}

/** Localized phase name lowercased only for English (mid-sentence use). German
 *  and Turkish phase nouns keep their casing. */
export function phaseNameLower(t: TFunc, locale: Locale, phase: CyclePhase): string {
  const name = phaseName(t, phase);
  return locale === 'en' ? name.toLowerCase() : name;
}

/** Join a list with commas and a localized final conjunction ("a, b and c"). */
export function listJoin(items: string[], and: string): string {
  if (items.length <= 1) return items[0] ?? '';
  const last = items[items.length - 1];
  return `${items.slice(0, -1).join(', ')} ${and} ${last}`;
}

/** Uppercase the first character (used for sentence-start labels). */
export function capitalizeFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
