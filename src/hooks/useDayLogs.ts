import { useState, useCallback, useMemo } from 'react';
import type { DayLog, DayLogs, SymptomSnapshot } from '../types';
import { ymd } from '../lib/cycle-math';
import { mirrorToDurable } from '../lib/durable-storage';

const STORAGE_KEY = 'cycle-tracker-daylogs-v1';
const NOTE_MAX_LENGTH = 500;

/**
 * True only if a day log carries at least one symptom/metric. A log whose
 * fields were all cleared (but whose key still lingers in storage with an
 * append-only `history`) returns false, so the calendar won't show a "logged"
 * dot for an effectively empty day.
 */
export function dayLogHasData(log: DayLog | undefined): boolean {
  if (!log) return false;
  return Boolean(
    log.mood?.length ||
    log.energy ||
    log.cramps ||
    log.sleep ||
    log.flow ||
    log.pain ||
    log.note ||
    log.functionalImpact !== undefined,
  );
}

function loadLogs(): DayLogs {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveLogs(logs: DayLogs) {
  try {
    const serialized = JSON.stringify(logs);
    localStorage.setItem(STORAGE_KEY, serialized);
    mirrorToDurable(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to persist day logs to localStorage', e);
  }
}

export function useDayLogs() {
  const [logs, setLogs] = useState<DayLogs>(loadLogs);

  const persist = useCallback((updater: (prev: DayLogs) => DayLogs) => {
    setLogs(prev => {
      const next = updater(prev);
      saveLogs(next);
      return next;
    });
  }, []);

  const getLog = useCallback((date: string): DayLog | undefined => {
    return logs[date];
  }, [logs]);

  const setLog = useCallback((date: string, log: DayLog) => {
    const sanitized = { ...log };
    if (sanitized.note && sanitized.note.length > NOTE_MAX_LENGTH) {
      sanitized.note = sanitized.note.slice(0, NOTE_MAX_LENGTH);
    }

    // Build a timestamped snapshot of the current symptom state
    const snapshot: SymptomSnapshot = { timestamp: new Date().toISOString() };
    if (sanitized.mood?.length) snapshot.mood = sanitized.mood;
    if (sanitized.energy) snapshot.energy = sanitized.energy;
    if (sanitized.cramps) snapshot.cramps = sanitized.cramps;
    if (sanitized.sleep) snapshot.sleep = sanitized.sleep;
    if (sanitized.flow) snapshot.flow = sanitized.flow;
    if (sanitized.pain) snapshot.pain = sanitized.pain;
    if (sanitized.functionalImpact !== undefined) snapshot.functionalImpact = sanitized.functionalImpact;
    if (sanitized.note) snapshot.note = sanitized.note;

    persist(prev => {
      const existing = prev[date];
      // Keep the last 20 snapshots — prevents unbounded localStorage growth
      const history = [...(existing?.history ?? []), snapshot].slice(-20);
      return { ...prev, [date]: { ...sanitized, history } };
    });
  }, [persist]);

  /**
   * Merge imported day logs into the current set (used by JSON backup import).
   * Non-destructive: a date the user doesn't have yet is added wholesale; a
   * date that already exists keeps its current fields but folds in any imported
   * history snapshots it doesn't already have (deduped by timestamp, capped at
   * 20). This replaces the old "skip if the date already exists" behavior,
   * which silently dropped imported logs on any collision.
   */
  const mergeLogs = useCallback((imported: DayLogs) => {
    persist(prev => {
      const next = { ...prev };
      for (const [date, incoming] of Object.entries(imported)) {
        const existing = next[date];
        if (!existing) {
          next[date] = incoming;
          continue;
        }
        const seen = new Set((existing.history ?? []).map(h => h.timestamp));
        const history = [
          ...(existing.history ?? []),
          ...(incoming.history ?? []).filter(h => !seen.has(h.timestamp)),
        ]
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
          .slice(-20);
        next[date] = { ...existing, history };
      }
      return next;
    });
  }, [persist]);

  const removeLog = useCallback((date: string) => {
    persist(prev => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }, [persist]);

  const clearAllLogs = useCallback(() => {
    persist(() => ({}));
  }, [persist]);

  const todayLog = useMemo(() => {
    return logs[ymd(new Date())];
  }, [logs]);

  return {
    allLogs: logs,
    getLog,
    setLog,
    mergeLogs,
    removeLog,
    clearAllLogs,
    todayLog,
  };
}
