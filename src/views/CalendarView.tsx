import { motion } from 'motion/react';
import { X, Droplets } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import { SymptomPills } from '../components/SymptomPills';
import { ActivePeriodBanner } from '../components/ActivePeriodBanner';
import type { Cycle, PhaseResult, DayLog, DayLogs } from '../types';
import { fromYmd, ymd, niceShort } from '../lib/cycle-math';

interface CalendarViewProps {
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  dayLogs?: DayLogs;
  onDayTap: (dateStr: string) => void;
  todayLog: DayLog | undefined;
  onUpdateTodayLog: (log: Partial<DayLog>) => void;
  hideFertility?: boolean;
  activeCycle: Cycle | null;
  onEndCycle: () => void;
  nextPeriod: { date: string; daysToNext: number } | null;
  /** 0–1 fraction of the current cycle elapsed (for the countdown ring). */
  cycleProgress: number;
  /** Non-null when picking the end date for a period that starts on this day. */
  selectionStart: string | null;
  onRangeSelect: (date: string) => void;
  onStillOngoing: () => void;
  onCancelSelection: () => void;
}

/** Small ring that fills as the cycle progresses toward the next period. */
function ProgressRing({ progress }: { progress: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative w-11 h-11 shrink-0 flex items-center justify-center">
      <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" strokeWidth="3" className="stroke-ink/10" />
        <circle
          cx="20" cy="20" r={r} fill="none" strokeWidth="3" strokeLinecap="round"
          className="stroke-menstrual transition-[stroke-dashoffset] duration-700"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
        />
      </svg>
      <Droplets size={15} className="text-menstrual relative" />
    </div>
  );
}

export function CalendarView({
  getPhaseForDate, dayLogs, onDayTap, todayLog, onUpdateTodayLog, hideFertility = false,
  activeCycle, onEndCycle, nextPeriod, cycleProgress,
  selectionStart, onRangeSelect, onStillOngoing, onCancelSelection,
}: CalendarViewProps) {
  const selecting = selectionStart !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Active period bar while a period is ongoing; otherwise a countdown
          to the next predicted period. */}
      {!selecting && activeCycle && (
        <ActivePeriodBanner activeCycle={activeCycle} onEndCycle={onEndCycle} />
      )}
      {!selecting && !activeCycle && nextPeriod && (
        <div className="glass rounded-2xl p-4 flex items-center gap-4 border border-accent/20">
          <ProgressRing progress={cycleProgress} />
          <div>
            <p className="text-sm font-semibold">
              {nextPeriod.daysToNext === 0
                ? 'Period expected today'
                : `Next period in ${nextPeriod.daysToNext} ${nextPeriod.daysToNext === 1 ? 'day' : 'days'}`}
            </p>
            <p className="text-xs text-ink/55 mt-0.5">Around {niceShort(nextPeriod.date)}</p>
          </div>
        </div>
      )}

      {/* End-date selection banner */}
      {selecting && (
        <div className="rounded-3xl p-4 bg-accent/15 border border-accent/30 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-accent">Pick the end date</div>
            <div className="text-xs text-ink/65 mt-0.5">
              Period starting {niceShort(selectionStart!)} — tap the last day, or:
            </div>
          </div>
          <button
            onClick={onStillOngoing}
            className="px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            Still ongoing
          </button>
          <button
            onClick={onCancelSelection}
            aria-label="Cancel"
            className="w-8 h-8 rounded-full bg-ink/[0.06] flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <div className="glass rounded-[2rem] p-5">
        {selecting ? (
          <CalendarGrid
            getPhaseForDate={getPhaseForDate}
            selectable
            selectedRange={[fromYmd(selectionStart!), null]}
            onSelectDate={(d) => onRangeSelect(ymd(d))}
            hideFertility={hideFertility}
          />
        ) : (
          <CalendarGrid
            getPhaseForDate={getPhaseForDate}
            dayLogs={dayLogs}
            onDayTap={onDayTap}
            hideFertility={hideFertility}
          />
        )}
      </div>

      {!selecting && (
        <>
          {/* Legend */}
          <div className="glass rounded-3xl p-4 flex flex-wrap justify-center gap-x-5 gap-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-menstrual" />
              <span className="text-xs font-medium text-ink/70">Period</span>
            </div>
            {!hideFertility && (
              <>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-follicular" />
                  <span className="text-xs font-medium text-ink/70">Fertile</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 rounded-full bg-ovulation" />
                  <span className="text-xs font-medium text-ink/70">Ovulation</span>
                </div>
              </>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded-full bg-luteal" />
              <span className="text-xs font-medium text-ink/70">Luteal</span>
            </div>
          </div>

          {/* Today's quick log */}
          <div className="glass rounded-[2rem] p-6">
            <SymptomPills log={todayLog} onUpdate={onUpdateTodayLog} />
          </div>
        </>
      )}
    </motion.div>
  );
}
