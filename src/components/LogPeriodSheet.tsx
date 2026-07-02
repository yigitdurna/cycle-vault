import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { CalendarGrid } from './CalendarGrid';
import { ymd, nice, fromYmd } from '../lib/cycle-math';
import { cn } from '../lib/utils';
import { useTranslation } from '../i18n';
import type { Cycle, PhaseResult } from '../types';

type SheetMode = 'start' | 'end' | 'log' | 'edit';

interface LogPeriodSheetProps {
  open: boolean;
  editingCycle: Cycle | null;
  activeCycle: Cycle | null;
  /** All recorded cycles — used to dim/disable days that fall inside an
   *  existing cycle so an interactive add/edit can't silently drop data. */
  cycles: Cycle[];
  onSave: (start: string, end: string | null) => void;
  onEndCycle: (end: string) => void;
  onClose: () => void;
}

const FAR_FUTURE = '9999-12-31';

/** True if the YYYY-MM-DD string falls inside the cycle (open cycles run to today→∞). */
function dateInCycle(dateStr: string, c: Cycle): boolean {
  return dateStr >= c.start && dateStr <= (c.end ?? FAR_FUTURE);
}

/** True if [aStart..aEnd] shares any day with the cycle (both YYYY-MM-DD strings). */
function rangeOverlapsCycle(aStart: string, aEnd: string, c: Cycle): boolean {
  return aStart <= (c.end ?? FAR_FUTURE) && c.start <= aEnd;
}

// Stub phase function for the log sheet calendar (no phase coloring needed)
const noPhase = (): PhaseResult | null => null;

const TITLE_KEYS: Record<SheetMode, string> = {
  start: 'titleStart',
  end: 'titleEnd',
  log: 'titleLog',
  edit: 'titleEdit',
};

const SAVE_KEYS: Record<SheetMode, string> = {
  start: 'saveStart',
  end: 'saveEnd',
  log: 'saveLog',
  edit: 'saveEdit',
};

export function LogPeriodSheet({ open, editingCycle, activeCycle, cycles, onSave, onEndCycle, onClose }: LogPeriodSheetProps) {
  const { t, locale } = useTranslation();
  const [mode, setMode] = useState<SheetMode>('start');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);

  useEffect(() => {
    if (open) {
      const nextMode: SheetMode = editingCycle ? 'edit' : activeCycle ? 'end' : 'start';
      setMode(nextMode);
      if (editingCycle) {
        setStart(fromYmd(editingCycle.start));
        setEnd(editingCycle.end ? fromYmd(editingCycle.end) : null);
      } else {
        setStart(null);
        setEnd(null);
      }
    }
  }, [editingCycle, activeCycle, open]);

  const todayStr = ymd(new Date());

  const handleSelectDate = (date: Date) => {
    if (mode === 'start') {
      setStart(date);
      setEnd(null);
    } else if (mode === 'end') {
      // Constrain to >= activeCycle start and <= today
      const dateStr = ymd(date);
      if (activeCycle && dateStr >= activeCycle.start && dateStr <= todayStr) {
        setStart(date);
      }
    } else {
      // log/edit mode — existing two-date behavior
      if (!start || (start && end)) {
        setStart(date);
        setEnd(null);
      } else {
        if (date < start) {
          setEnd(start);
          setStart(date);
        } else {
          setEnd(date);
        }
      }
    }
  };

  const handleSave = () => {
    if (mode === 'start' && start) {
      onSave(ymd(start), null);
    } else if (mode === 'end' && start) {
      onEndCycle(ymd(start));
    } else if ((mode === 'log' || mode === 'edit') && start && end) {
      onSave(ymd(start), ymd(end));
    }
  };

  // Cycles that a new/edited range must not overlap. In 'edit' mode the cycle
  // being edited is excluded (moving it onto its own days is fine).
  const conflictCycles =
    mode === 'edit' && editingCycle
      ? cycles.filter(c => c.start !== editingCycle.start)
      : cycles;

  const rangeHasConflict = (a: string, b: string) =>
    conflictCycles.some(c => rangeOverlapsCycle(a, b, c));

  const canSave =
    // A 'start' save opens an open-ended cycle (start→∞), so it conflicts with
    // ANY cycle ending on/after the picked day — not just cycles containing it.
    (mode === 'start' && !!start && !rangeHasConflict(ymd(start), FAR_FUTURE)) ||
    (mode === 'end' && !!start) ||
    ((mode === 'log' || mode === 'edit') && !!start && !!end &&
      !rangeHasConflict(ymd(start), ymd(end)));

  // Build selectedRange for CalendarGrid
  const selectedRange: [Date | null, Date | null] = (() => {
    if (mode === 'start') return [start, null];
    if (mode === 'end') return [activeCycle ? fromYmd(activeCycle.start) : null, start];
    return [start, end];
  })();

  // Constrain the calendar per mode so out-of-range days are dimmed + disabled
  // rather than silently ignored (or worse, committed and then dropped):
  //  - 'end':   [activeCycle.start … today].
  //  - 'start': <= today AND after every existing cycle — the new cycle is
  //             open-ended (start→∞), so any cycle ending on/after the day
  //             would overlap it.
  //  - 'log':   <= today AND not inside any existing cycle (incl. the active one,
  //             which occupies start→today).
  //  - 'edit':  <= today AND not inside any cycle other than the one being edited.
  const isDateSelectable = (() => {
    if (mode === 'end' && activeCycle) {
      return (date: Date) => {
        const s = ymd(date);
        return s >= activeCycle.start && s <= todayStr;
      };
    }
    if (mode === 'start') {
      return (date: Date) => {
        const s = ymd(date);
        if (s > todayStr) return false;
        return !rangeHasConflict(s, FAR_FUTURE);
      };
    }
    if (mode === 'log' || mode === 'edit') {
      return (date: Date) => {
        const s = ymd(date);
        if (s > todayStr) return false;
        return !conflictCycles.some(c => dateInCycle(s, c));
      };
    }
    return undefined;
  })();

  const switchMode = (next: SheetMode) => {
    setMode(next);
    setStart(null);
    setEnd(null);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
        >
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg bg-bg border-t border-ink/[0.08] rounded-t-[2rem] p-6 pb-10 max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-ink/[0.12] mx-auto mb-4" />

            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-bold">
                {t(`sheet.${TITLE_KEYS[mode]}`)}
              </h3>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-ink/[0.05] flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            {/* Mode tabs — only show when not editing */}
            {!editingCycle && (
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => switchMode('start')}
                  disabled={!!activeCycle}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all',
                    mode === 'start'
                      ? 'bg-ink/[0.10] text-ink'
                      : 'bg-ink/[0.05] text-ink/55',
                    activeCycle && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {t('sheet.tabStart')}
                </button>
                {activeCycle && (
                  <button
                    onClick={() => switchMode('end')}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all',
                      mode === 'end'
                        ? 'bg-ink/[0.10] text-ink'
                        : 'bg-ink/[0.05] text-ink/55'
                    )}
                  >
                    {t('sheet.tabEnd')}
                  </button>
                )}
                <button
                  onClick={() => switchMode('log')}
                  className={cn(
                    'flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all',
                    mode === 'log'
                      ? 'bg-ink/[0.10] text-ink'
                      : 'bg-ink/[0.05] text-ink/55'
                  )}
                >
                  {t('sheet.tabLog')}
                </button>
              </div>
            )}

            {/* Selection display */}
            <div className="flex gap-4 mb-6">
              {mode === 'start' && (
                <div className="flex-1 glass rounded-2xl p-3 text-center">
                  <div className="text-[10px] text-ink/55 uppercase tracking-wider">{t('sheet.labelStart')}</div>
                  <div className="text-sm font-medium mt-1">
                    {start ? nice(ymd(start), locale) : '—'}
                  </div>
                </div>
              )}

              {mode === 'end' && activeCycle && (
                <>
                  <div className="flex-1 glass rounded-2xl p-3 text-center">
                    <div className="text-[10px] text-ink/55 uppercase tracking-wider">{t('sheet.labelStarted')}</div>
                    <div className="text-sm font-medium mt-1">{nice(activeCycle.start, locale)}</div>
                  </div>
                  <div className="flex-1 glass rounded-2xl p-3 text-center">
                    <div className="text-[10px] text-ink/55 uppercase tracking-wider">{t('sheet.labelEnd')}</div>
                    <div className="text-sm font-medium mt-1">
                      {start ? nice(ymd(start), locale) : '—'}
                    </div>
                  </div>
                </>
              )}

              {(mode === 'log' || mode === 'edit') && (
                <>
                  <div className="flex-1 glass rounded-2xl p-3 text-center">
                    <div className="text-[10px] text-ink/55 uppercase tracking-wider">{t('sheet.labelStart')}</div>
                    <div className="text-sm font-medium mt-1">
                      {start ? nice(ymd(start), locale) : '—'}
                    </div>
                  </div>
                  <div className="flex-1 glass rounded-2xl p-3 text-center">
                    <div className="text-[10px] text-ink/55 uppercase tracking-wider">{t('sheet.labelEnd')}</div>
                    <div className="text-sm font-medium mt-1">
                      {end ? nice(ymd(end), locale) : '—'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Calendar */}
            <div className="glass rounded-[2rem] p-4 mb-6">
              <CalendarGrid
                getPhaseForDate={noPhase}
                selectable
                selectedRange={selectedRange}
                onSelectDate={handleSelectDate}
                isDateSelectable={isDateSelectable}
              />
            </div>

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="w-full py-4 rounded-2xl bg-accent text-white font-semibold text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {t(`sheet.${SAVE_KEYS[mode]}`)}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
