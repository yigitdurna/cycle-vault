import { motion } from 'motion/react';
import { Droplets, X } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import { SymptomPills } from '../components/SymptomPills';
import type { Cycle, PhaseResult, DayLog, DayLogs } from '../types';
import { getNextPeriodDate, fromYmd, ymd, niceShort } from '../lib/cycle-math';

interface CalendarViewProps {
  cycles: Cycle[];
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  dayLogs?: DayLogs;
  onDayTap: (dateStr: string) => void;
  todayLog: DayLog | undefined;
  onUpdateTodayLog: (log: Partial<DayLog>) => void;
  hideFertility?: boolean;
  customCycleLength?: number;
  /** Non-null when picking the end date for a period that starts on this day. */
  selectionStart: string | null;
  onRangeSelect: (date: string) => void;
  onStillOngoing: () => void;
  onCancelSelection: () => void;
}

export function CalendarView({
  cycles, getPhaseForDate, dayLogs, onDayTap, todayLog, onUpdateTodayLog,
  hideFertility = false, customCycleLength,
  selectionStart, onRangeSelect, onStillOngoing, onCancelSelection,
}: CalendarViewProps) {
  const nextPeriod = getNextPeriodDate(cycles, customCycleLength);
  const selecting = selectionStart !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <h2 className="text-3xl font-serif font-bold">Calendar</h2>

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
          <div className="glass rounded-3xl p-4 flex flex-wrap gap-x-5 gap-y-2.5">
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
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-xs font-medium text-ink/70">Logged</span>
            </div>
          </div>

          {/* Today's quick log */}
          <div className="glass rounded-[2rem] p-6">
            <SymptomPills log={todayLog} onUpdate={onUpdateTodayLog} />
          </div>

          {/* Upcoming */}
          {cycles.length > 0 && nextPeriod && (
            <div className="glass rounded-3xl p-6">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-ink/55 mb-4">Upcoming</h4>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-menstrual/15 flex items-center justify-center">
                  <Droplets size={18} className="text-menstrual" />
                </div>
                <div>
                  <p className="font-medium">Next Period</p>
                  <p className="text-xs text-ink/55">In {nextPeriod.daysToNext} {nextPeriod.daysToNext === 1 ? 'day' : 'days'}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
