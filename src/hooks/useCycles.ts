import { useState, useCallback, useMemo, useRef } from 'react';
import type { Cycle, PhaseResult, DayLogs } from '../types';
import { phaseTypeToUI } from '../types';
import {
  ymd,
  diff,
  getPhaseForDate,
  getNextPeriodDate,
  getCurrentCycleDay,
} from '../lib/cycle-math';
import { PHASES } from '../types';
import { exportFile } from '../lib/export-file';
import { mirrorToDurable } from '../lib/durable-storage';

const STORAGE_KEY = 'cycle-tracker-calendar-v4';

/** Returns true if two cycles share any overlapping days. */
function cyclesOverlap(a: Cycle, b: Cycle): boolean {
  const FAR_FUTURE = '9999-12-31';
  const aEnd = a.end ?? FAR_FUTURE;
  const bEnd = b.end ?? FAR_FUTURE;
  return a.start <= bEnd && b.start <= aEnd;
}

/**
 * Sort cycles by start date and remove any overlapping entries.
 * When two cycles overlap the one with the later start wins —
 * it is more likely to be intentional (explicitly entered or imported).
 */
function sanitizeCycles(cycles: Cycle[]): Cycle[] {
  const sorted = [...cycles].sort((a, b) => a.start.localeCompare(b.start));
  const result: Cycle[] = [];
  for (const candidate of sorted) {
    // Since we process in start-date order, the candidate always has a
    // start >= any entry already in result. Remove the overlapping entry
    // (earlier start) and add the candidate (later start wins).
    const overlapIdx = result.findIndex(existing => cyclesOverlap(existing, candidate));
    if (overlapIdx !== -1) {
      result.splice(overlapIdx, 1);
    }
    result.push(candidate);
  }
  return result;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse CSV text into rows of fields. Handles quoted fields, escaped quotes
 * ("") and commas/newlines inside quotes — so a quoted free-text note can't
 * desync the columns. Supports both \n and \r\n line endings.
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cur); cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      rows.push(row); row = [];
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

function loadCycles(): Cycle[] {
  try {
    const raw: Cycle[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const clean = sanitizeCycles(raw);
    // Always persist — sanitizeCycles also sorts, so even a reorder needs saving
    saveCycles(clean);
    return clean;
  } catch {
    return [];
  }
}

function saveCycles(cycles: Cycle[]) {
  try {
    const serialized = JSON.stringify(cycles);
    localStorage.setItem(STORAGE_KEY, serialized);
    mirrorToDurable(STORAGE_KEY, serialized);
  } catch (e) {
    console.warn('Failed to persist cycles to localStorage', e);
  }
}

export function useCycles(defaultCycleLength = 28, hideFertility = false) {
  const [cycles, setCycles] = useState<Cycle[]>(loadCycles);

  // Always points at the latest cycles. The async import callbacks below
  // pre-compute their merge against current state (the FileReader.onload
  // fires long after the callback was created), so they must read this ref
  // rather than the `cycles` captured in their closure — otherwise an import
  // run after the user adds a cycle would merge against a stale snapshot and
  // drop the newer entry.
  const cyclesRef = useRef(cycles);
  cyclesRef.current = cycles;

  const persist = useCallback((updater: (prev: Cycle[]) => Cycle[]) => {
    setCycles(prev => {
      const clean = sanitizeCycles(updater(prev));
      saveCycles(clean);
      return clean;
    });
  }, []);

  // --- CRUD ---

  const addCycle = useCallback((start: string, end: string | null) => {
    persist(prev => {
      // Data-loss guard: an interactive add must NEVER silently delete an
      // existing cycle. sanitizeCycles resolves overlaps by "later start wins"
      // and drops the loser — intentional for imports (which pre-compute their
      // own merge and bypass addCycle via persist(() => precomputed)), but here
      // it would discard a period the user already logged. Both directions bite:
      // a new open cycle overlapping a closed one (stale "did your period start?"
      // notification), and a logged range overlapping the active cycle. So refuse
      // (no-op) whenever the incoming cycle overlaps ANY existing cycle, open or
      // closed. UI paths dim conflicting days; this is the backstop.
      const incoming: Cycle = { start, end };
      if (prev.some(c => cyclesOverlap(c, incoming))) return prev;
      return [...prev, incoming];
    });
  }, [persist]);

  const updateCycle = useCallback((oldStart: string, newStart: string, newEnd: string | null) => {
    persist(prev => {
      // Same non-destructive rule as addCycle: refuse the edit if the new range
      // would overlap any cycle OTHER than the one being edited (matched by
      // oldStart), which sanitizeCycles would otherwise silently drop.
      const incoming: Cycle = { start: newStart, end: newEnd };
      if (prev.some(c => c.start !== oldStart && cyclesOverlap(c, incoming))) return prev;
      return prev.map(c => c.start === oldStart ? incoming : c);
    });
  }, [persist]);

  const deleteCycle = useCallback((start: string) => {
    persist(prev => prev.filter(c => c.start !== start));
  }, [persist]);

  const endCycle = useCallback((end: string) => {
    persist(prev => prev.map(c =>
      c.end === null ? { ...c, end } : c
    ));
  }, [persist]);

  const clearAll = useCallback(() => {
    persist(() => []);
  }, [persist]);

  // --- Computed ---

  const todayPhase: PhaseResult | null = useMemo(() => {
    return getPhaseForDate(ymd(new Date()), cycles, defaultCycleLength);
  }, [cycles, defaultCycleLength]);

  const todayUIPhase = useMemo(() => {
    if (!todayPhase) return PHASES.Follicular;
    return PHASES[phaseTypeToUI(todayPhase.type, hideFertility)];
  }, [todayPhase, hideFertility]);

  const nextPeriod = useMemo(() => {
    return getNextPeriodDate(cycles, defaultCycleLength);
  }, [cycles, defaultCycleLength]);

  const cycleDay = useMemo(() => {
    return getCurrentCycleDay(cycles, defaultCycleLength);
  }, [cycles, defaultCycleLength]);

  const activeCycle = useMemo(() => {
    return cycles.find(c => c.end === null) ?? null;
  }, [cycles]);

  // --- Export/Import ---

  const exportJSON = useCallback((dayLogs?: DayLogs) => {
    const data = { cycles, ...(dayLogs && Object.keys(dayLogs).length > 0 ? { dayLogs } : {}) };
    return exportFile(
      'cycle-vault-backup.json',
      JSON.stringify(data, null, 2),
      'application/json',
    );
  }, [cycles]);

  const exportCSV = useCallback((dayLogs: DayLogs = {}) => {
    const logDates = Object.keys(dayLogs).sort();
    const hasDayLogs = logDates.length > 0;

    // Escape a CSV cell value AND neutralize spreadsheet formula injection:
    // a cell beginning with = + - @ (or a control char) can execute as a
    // formula when opened in Excel/Sheets. Prefix those with a single quote.
    const esc = (v: string) => {
      const guarded = /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
      return guarded.includes(',') || guarded.includes('"') || guarded.includes('\n')
        ? '"' + guarded.replace(/"/g, '""') + '"'
        : guarded;
    };

    let csvContent: string;
    let filename: string;

    if (hasDayLogs) {
      const header = 'Date,Period Start,Period End,Flow,Mood,Energy,Cramps,Pain Locations,Pain Severity,Affected My Day,Note';
      const rows = logDates.map(date => {
        const log = dayLogs[date];
        const cycle = cycles.find(c => c.start <= date && (!c.end || c.end >= date));
        const flow = log.flow ?? '';
        const mood = log.mood?.join('; ') ?? '';
        const energy = log.energy != null ? ['Low', 'Moderate', 'High'][log.energy - 1] : '';
        const cramps = log.cramps != null ? ['Mild', 'Moderate', 'Severe'][log.cramps - 1] : '';
        const painLocs = log.pain?.locations.join('; ') ?? '';
        const painSev = log.pain != null ? ['Mild', 'Moderate', 'Severe'][log.pain.severity - 1] : '';
        const impact = log.functionalImpact === true ? 'Yes' : log.functionalImpact === false ? 'No' : '';
        const note = log.note ?? '';
        // esc() both CSV-quotes and neutralizes formula injection. Apply it to
        // every user/imported-derived cell, not just the note.
        return [date, cycle?.start ?? '', cycle?.end ?? '', flow, mood, energy, cramps, painLocs, painSev, impact, note]
          .map(esc).join(',');
      });
      csvContent = [header, ...rows].join('\n');
      filename = 'cycle-vault-symptoms.csv';
    } else {
      // No symptom data logged — fall back to cycle dates only
      if (!cycles.length) return;
      const header = 'Start Date,End Date';
      const rows = cycles.map(c => `${c.start},${c.end || ''}`);
      csvContent = [header, ...rows].join('\n');
      filename = 'cycle-vault-cycles.csv';
    }

    return exportFile(filename, csvContent, 'text/csv;charset=utf-8;');
  }, [cycles]);

  const importCSV = useCallback((file: File): Promise<number> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const rows = parseCsv(text);

        // Locate the start/end date columns by header name. This supports both
        // the simple cycles export (Start Date,End Date) and the richer symptom
        // export (Date,Period Start,Period End,...) — without the latter being
        // mis-read as start=Date, end=Period Start (which used to corrupt data).
        let startIdx = 0;
        let endIdx = 1;
        let dataStart = 0;
        if (rows.length > 0) {
          const header = rows[0].map(h => h.trim().toLowerCase());
          const hasHeader = header.some(h => h.includes('start') || h.includes('date'));
          if (hasHeader) {
            dataStart = 1;
            const find = (...names: string[]) => header.findIndex(h => names.includes(h));
            const s = find('period start', 'start date', 'start');
            const en = find('period end', 'end date', 'end');
            if (s !== -1) startIdx = s;
            if (en !== -1) endIdx = en;
          }
        }

        // A symptom CSV repeats the same period start on every logged day, so
        // dedupe by start as we parse.
        const parsed: Cycle[] = [];
        const seenStarts = new Set<string>();
        for (let i = dataStart; i < rows.length; i++) {
          const start = (rows[i][startIdx] ?? '').trim();
          const end = (rows[i][endIdx] ?? '').trim();
          if (DATE_RE.test(start) && !seenStarts.has(start)) {
            seenStarts.add(start);
            // Only accept an end date that is valid AND not before the start
            // (matches the JSON-import guard); otherwise treat as open-ended.
            const validEnd = DATE_RE.test(end) && end >= start;
            parsed.push({ start, end: validEnd ? end : null });
          }
        }

        if (parsed.length > 0) {
          // Pre-compute merge using current cycles snapshot so count is
          // ready before resolve() fires (React 18 batches the updater).
          let count = 0;
          let precomputed: Cycle[] = [...cyclesRef.current];
          for (const c of parsed) {
            // A later-start import wins over any overlapping cycle (matches
            // sanitizeCycles): drop overlaps, then add the incoming one.
            precomputed = precomputed.filter(existing => !cyclesOverlap(existing, c));
            precomputed.push(c);
            count++;
          }
          persist(() => precomputed);
          resolve(count);
        } else {
          resolve(0);
        }
      };
      reader.readAsText(file);
    });
  }, [persist]);

  const importJSON = useCallback((file: File): Promise<{ cycles: number; dayLogs: DayLogs }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const raw = JSON.parse(e.target?.result as string);
          // Support both old format (Cycle[]) and new format ({ cycles, dayLogs })
          const importedCycles: Cycle[] = Array.isArray(raw) ? raw : (raw.cycles ?? []);
          const importedLogs: DayLogs = Array.isArray(raw) ? {} : (raw.dayLogs ?? {});

          let count = 0;
          if (importedCycles.length > 0) {
            let precomputed: Cycle[] = [...cyclesRef.current];
            for (const c of importedCycles) {
              if (!c.start || !DATE_RE.test(c.start)) continue;
              // Validate end the same way CSV import does: only accept a
              // well-formed date that is not before the start; otherwise null.
              const validEnd =
                typeof c.end === 'string' && DATE_RE.test(c.end) && c.end >= c.start
                  ? c.end
                  : null;
              const incoming: Cycle = { start: c.start, end: validEnd };
              // Later-start import wins over any overlap (see importCSV).
              precomputed = precomputed.filter(existing => !cyclesOverlap(existing, incoming));
              precomputed.push(incoming);
              count++;
            }
            persist(() => precomputed);
          }
          resolve({ cycles: count, dayLogs: importedLogs });
        } catch {
          resolve({ cycles: 0, dayLogs: {} });
        }
      };
      reader.readAsText(file);
    });
  }, [persist]);

  return {
    cycles,
    activeCycle,
    addCycle,
    updateCycle,
    deleteCycle,
    endCycle,
    clearAll,
    todayPhase,
    todayUIPhase,
    nextPeriod,
    cycleDay,
    exportJSON,
    exportCSV,
    importCSV,
    importJSON,
    getPhaseForDate: (dateStr: string) => getPhaseForDate(dateStr, cycles, defaultCycleLength),
  };
}
