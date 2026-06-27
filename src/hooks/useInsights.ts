import { useMemo } from 'react';
import type { Cycle, DayLog, DayLogs, CyclePhase } from '../types';
import {
  generateInsights,
  getCycleLengthAlert,
  getPersonalizedPhaseDescription,
  getTodayInsights,
  getPhaseForDay,
} from '../lib/insights';
import type { TFunc, Locale } from '../i18n';

// `t`/`locale` are passed in (not read from context) because this hook is
// called in App's body, which sits above App's own LocaleContext.Provider — so
// the context here would resolve to the English default. The caller supplies
// the active translator instead.
export function useInsights(logs: DayLogs, cycles: Cycle[], todayLog: DayLog | undefined, t: TFunc, locale: Locale) {
  const insights = useMemo(
    () => generateInsights(logs, cycles, t, locale),
    [logs, cycles, t, locale],
  );

  const cycleLengthAlert = useMemo(
    () => getCycleLengthAlert(cycles, t),
    [cycles, t],
  );

  const hasEnoughData = cycles.length >= 2;

  const getPhaseDescription = useMemo(() => {
    return (phase: CyclePhase) => getPersonalizedPhaseDescription(logs, cycles, phase, t);
  }, [logs, cycles, t]);

  const todayInsights = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const phase = getPhaseForDay(today, cycles) ?? 'Follicular';
    return getTodayInsights(todayLog, logs, cycles, phase, t, locale);
  }, [logs, cycles, todayLog, t, locale]);

  return { insights, cycleLengthAlert, hasEnoughData, getPhaseDescription, todayInsights };
}
