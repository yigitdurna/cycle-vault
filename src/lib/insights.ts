import type { Cycle, CyclePhase, DayLog, DayLogs, PhaseSymptomPattern, CycleLengthAlert, Insight } from '../types';
import { getPhaseForDate, diff } from './cycle-math';
import { phaseTypeToUI } from '../types';
import { defaultT, listJoin, phaseName, phaseNameLower, capitalizeFirst, type TFunc, type Locale } from '../i18n';

/** Catalog leaf for a tracked symptom's mid-sentence label. */
const SYMPTOM_LABEL_KEY: Record<string, string> = {
  cramps: 'symptomLabelCramps',
  energy: 'symptomLabelEnergy',
  mood: 'symptomLabelMood',
  pain: 'symptomLabelPain',
  flow: 'symptomLabelFlow',
  sleep: 'symptomLabelSleep',
};

/** Catalog leaf for a 1–3 severity word. */
const SEVERITY_WORD_KEY: Record<number, string> = {
  1: 'severityWordMild',
  2: 'severityWordModerate',
  3: 'severityWordStrong',
};

function symptomLabel(t: TFunc, symptom: string): string {
  const key = SYMPTOM_LABEL_KEY[symptom];
  return key ? t(`insights.${key}`) : symptom;
}

function severityWord(t: TFunc, severity: number): string {
  return t(`insights.${SEVERITY_WORD_KEY[severity] ?? SEVERITY_WORD_KEY[2]}`);
}

/**
 * Returns the UI phase name for a date, or null if unknown.
 * Thin wrapper around getPhaseForDate + phaseTypeToUI.
 */
export function getPhaseForDay(dateStr: string, cycles: Cycle[]): CyclePhase | null {
  const result = getPhaseForDate(dateStr, cycles);
  if (!result || result.type === 'future') return null;
  return phaseTypeToUI(result.type);
}

// Symptoms we track as present/absent with optional severity
const TRACKED_SYMPTOMS = ['cramps', 'energy', 'sleep', 'flow', 'mood', 'pain'] as const;

/**
 * Analyze which symptoms appear in which phases, across all logged days.
 * Returns patterns sorted by frequency (highest first).
 * Requires >= 2 cycles to produce results.
 */
export function getPhaseSymptomPatterns(
  logs: DayLogs,
  cycles: Cycle[],
): PhaseSymptomPattern[] {
  if (cycles.length < 2) return [];

  const dates = Object.keys(logs);
  if (dates.length === 0) return [];

  // Count: { "cramps|Menstrual": { occurrences, totalLogged, severitySum } }
  const counts = new Map<string, { occurrences: number; totalLogged: number; severitySum: number }>();

  for (const dateStr of dates) {
    const log = logs[dateStr];
    const phase = getPhaseForDay(dateStr, cycles);
    if (!phase) continue;

    for (const symptom of TRACKED_SYMPTOMS) {
      const key = `${symptom}|${phase}`;
      if (!counts.has(key)) {
        counts.set(key, { occurrences: 0, totalLogged: 0, severitySum: 0 });
      }
      const entry = counts.get(key)!;
      entry.totalLogged++;

      const value = log[symptom as keyof typeof log];
      if (value !== undefined && value !== null) {
        // mood is an array, pain is an object — check non-empty
        if (Array.isArray(value) ? value.length > 0 : true) {
          entry.occurrences++;
          if (typeof value === 'number') {
            entry.severitySum += value;
          }
        }
      }
    }
  }

  const patterns: PhaseSymptomPattern[] = [];

  for (const [key, data] of counts) {
    if (data.occurrences === 0) continue;
    const [symptom, phase] = key.split('|') as [string, CyclePhase];
    patterns.push({
      symptom,
      phase,
      occurrences: data.occurrences,
      totalDaysInPhase: data.totalLogged,
      frequency: data.occurrences / data.totalLogged,
      avgSeverity: data.severitySum > 0 ? data.severitySum / data.occurrences : undefined,
    });
  }

  return patterns.sort((a, b) => b.frequency - a.frequency);
}

const DEVIATION_THRESHOLD = 3; // days

/**
 * Check if the most recent completed cycle length deviates
 * significantly from the user's median. Requires >= 3 cycles
 * (need at least 2 lengths to compute a median, then 1 to compare).
 */
export function getCycleLengthAlert(cycles: Cycle[], t: TFunc = defaultT): CycleLengthAlert | null {
  // Need >= 4 cycles: 3 lengths to compute a stable median, 1 to compare against.
  // 3 cycles only gives 1 historical data point — statistically meaningless.
  if (cycles.length < 4) return null;

  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const starts = sorted.map(c => c.start);

  const lengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    lengths.push(diff(starts[i], starts[i - 1]));
  }

  if (lengths.length < 2) return null;

  // Median of all lengths except the most recent
  const historicalLengths = lengths.slice(0, -1);
  const sortedH = [...historicalLengths].sort((a, b) => a - b);
  const mid = Math.floor(sortedH.length / 2);
  const median = sortedH.length % 2
    ? sortedH[mid]
    : (sortedH[mid - 1] + sortedH[mid]) / 2;

  const currentLength = lengths[lengths.length - 1];
  const deviation = currentLength - Math.round(median);

  if (Math.abs(deviation) <= DEVIATION_THRESHOLD) return null;

  const direction = t(deviation > 0 ? 'insights.cycleDirectionLate' : 'insights.cycleDirectionEarly');
  const roundedMedian = Math.round(median);
  return {
    currentLength,
    medianLength: roundedMedian,
    deviation,
    message: t('insights.cycleLengthMessage', {
      days: Math.abs(deviation),
      direction,
      current: currentLength,
      usual: roundedMedian,
    }),
  };
}

/**
 * Generate a 1-2 sentence description for a phase based on the user's data.
 * Returns null if insufficient data (< 2 cycles or no logs in this phase).
 */
export function getPersonalizedPhaseDescription(
  logs: DayLogs,
  cycles: Cycle[],
  phase: CyclePhase,
  t: TFunc = defaultT,
): string | null {
  if (cycles.length < 2) return null;

  const patterns = getPhaseSymptomPatterns(logs, cycles);
  const phasePatterns = patterns
    .filter(p => p.phase === phase && p.frequency >= 0.4)
    .slice(0, 3);

  if (phasePatterns.length === 0) return null;

  const parts: string[] = [];

  for (const p of phasePatterns) {
    const pct = Math.round(p.frequency * 100);
    const label = symptomLabel(t, p.symptom);

    if (p.avgSeverity !== undefined) {
      const severity = severityWord(t, Math.round(p.avgSeverity));
      parts.push(t('insights.personalizedPartSeverity', { severity, label, pct }));
    } else {
      parts.push(t('insights.personalizedPart', { label, pct }));
    }
  }

  const joined = listJoin(parts, t('insights.listAnd'));
  const key = parts.length === 1 ? 'insights.personalizedSingle' : 'insights.personalizedMultiple';
  return t(key, { parts: joined });
}

const MAX_INSIGHTS = 4;
const MIN_FREQUENCY_FOR_INSIGHT = 0.4;

/**
 * Generate all insights from cycles + logs.
 * Returns up to 4 insights, sorted by confidence.
 * Requires >= 2 cycles.
 */
export function generateInsights(
  logs: DayLogs,
  cycles: Cycle[],
  t: TFunc = defaultT,
  locale: Locale = 'en',
): Insight[] {
  if (cycles.length < 2) return [];

  const insights: Insight[] = [];
  let idCounter = 0;

  // 1. Phase-symptom patterns → pattern insights
  const patterns = getPhaseSymptomPatterns(logs, cycles);
  // Deduplicate by (symptom + phase) so luteal cramps and menstrual cramps
  // each get their own card instead of the lower-frequency one being dropped.
  const seen = new Set<string>();

  for (const p of patterns) {
    const key = `${p.symptom}|${p.phase}`;
    if (seen.has(key)) continue;
    if (p.frequency < MIN_FREQUENCY_FOR_INSIGHT) continue;
    seen.add(key);

    const pct = Math.round(p.frequency * 100);
    const label = symptomLabel(t, p.symptom);
    const descKey = p.avgSeverity ? 'insights.patternDescSeverity' : 'insights.patternDesc';
    const severity = p.avgSeverity ? severityWord(t, Math.round(p.avgSeverity)) : '';

    insights.push({
      id: `pattern-${idCounter++}`,
      category: 'pattern',
      title: capitalizeFirst(t('insights.patternTitle', { label, phase: phaseName(t, p.phase) })),
      description: t(descKey, { label, severity, pct, phase: phaseNameLower(t, locale, p.phase) }),
      phase: p.phase,
      confidence: p.frequency,
    });
  }

  // 2. Cycle length alert → cycle-length insight
  const alert = getCycleLengthAlert(cycles, t);
  if (alert) {
    insights.push({
      id: `cycle-len-${idCounter++}`,
      category: 'cycle-length',
      title: t(alert.deviation > 0 ? 'insights.periodLate' : 'insights.periodEarly'),
      description: alert.message,
      confidence: Math.min(1, 0.5 + Math.abs(alert.deviation) / 20),
    });
  }

  insights.sort((a, b) => b.confidence - a.confidence);
  return insights.slice(0, MAX_INSIGHTS);
}

/**
 * Generate 1–3 insights relevant to today specifically.
 * Always includes a phase tip. Adds pattern-based and symptom-match
 * insights when enough data exists (>= 2 cycles).
 */
export function getTodayInsights(
  todayLog: DayLog | undefined,
  logs: DayLogs,
  cycles: Cycle[],
  phase: CyclePhase,
  t: TFunc = defaultT,
  locale: Locale = 'en',
): Insight[] {
  const insights: Insight[] = [];

  // 1. Phase tip — always shown
  insights.push({
    id: 'today-phase-tip',
    category: 'prediction',
    title: t(`insights.tip${phase}Title`),
    description: t(`insights.tip${phase}Desc`),
    phase,
    confidence: 1,
  });

  if (cycles.length < 2) return insights;

  const patterns = getPhaseSymptomPatterns(logs, cycles);

  // 2. Heads-up about the most common symptom for this phase
  const topPattern = patterns.find(p => p.phase === phase && p.frequency >= 0.5);
  if (topPattern) {
    const label = symptomLabel(t, topPattern.symptom);
    const pct = Math.round(topPattern.frequency * 100);
    const descKey = topPattern.avgSeverity ? 'insights.headsUpDescSeverity' : 'insights.headsUpDesc';
    const severity = topPattern.avgSeverity ? severityWord(t, Math.round(topPattern.avgSeverity)) : '';
    insights.push({
      id: 'today-heads-up',
      category: 'pattern',
      title: capitalizeFirst(t('insights.headsUpTitle', { label })),
      description: t(descKey, { label, severity, pct, phase: phaseNameLower(t, locale, phase) }),
      phase,
      confidence: topPattern.frequency,
    });
  }

  // 3. Flag an unusual symptom if something logged today is out of pattern
  if (todayLog) {
    const loggedSymptoms: string[] = [];
    if (todayLog.mood?.length) loggedSymptoms.push('mood');
    if (todayLog.cramps) loggedSymptoms.push('cramps');
    if (todayLog.energy) loggedSymptoms.push('energy');
    if (todayLog.flow) loggedSymptoms.push('flow');
    if (todayLog.pain) loggedSymptoms.push('pain');
    if (todayLog.sleep) loggedSymptoms.push('sleep');

    for (const sym of loggedSymptoms) {
      const pattern = patterns.find(p => p.symptom === sym && p.phase === phase);
      // Only flag if we have history for this symptom in this phase AND it's rare
      if (pattern && pattern.totalDaysInPhase >= 3 && pattern.frequency < 0.25) {
        const label = symptomLabel(t, sym);
        insights.push({
          id: 'today-unusual',
          category: 'anomaly',
          title: capitalizeFirst(t('insights.unusualTitle', { label })),
          description: t('insights.unusualDesc', {
            label,
            phase: phaseNameLower(t, locale, phase),
            pct: Math.round(pattern.frequency * 100),
          }),
          phase,
          confidence: 0.7,
        });
        break; // One anomaly card is enough
      }
    }
  }

  return insights;
}
