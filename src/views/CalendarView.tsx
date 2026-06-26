import { motion } from 'motion/react';
import { Droplets, Plus } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import { SymptomPills } from '../components/SymptomPills';
import type { Cycle, PhaseResult, DayLog, DayLogs } from '../types';
import { getNextPeriodDate } from '../lib/cycle-math';

interface CalendarViewProps {
  cycles: Cycle[];
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  dayLogs?: DayLogs;
  onDayTap: (dateStr: string) => void;
  todayLog: DayLog | undefined;
  onUpdateTodayLog: (log: Partial<DayLog>) => void;
  onLogPeriod: () => void;
  hideFertility?: boolean;
  customCycleLength?: number;
}

export function CalendarView({ cycles, getPhaseForDate, dayLogs, onDayTap, todayLog, onUpdateTodayLog, onLogPeriod, hideFertility = false, customCycleLength }: CalendarViewProps) {
  const nextPeriod = getNextPeriodDate(cycles, customCycleLength);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-serif font-bold">Calendar</h2>
        <button
          onClick={onLogPeriod}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
          Log period
        </button>
      </div>

      <div className="glass rounded-[2rem] p-5">
        <CalendarGrid
          getPhaseForDate={getPhaseForDate}
          dayLogs={dayLogs}
          onDayTap={onDayTap}
          hideFertility={hideFertility}
        />
      </div>

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
    </motion.div>
  );
}
