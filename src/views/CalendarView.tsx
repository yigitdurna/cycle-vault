import { motion } from 'motion/react';
import { Droplets } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import type { Cycle, PhaseResult, DayLogs } from '../types';
import { getNextPeriodDate } from '../lib/cycle-math';

interface CalendarViewProps {
  cycles: Cycle[];
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  dayLogs?: DayLogs;
  onDayTap: (dateStr: string) => void;
  hideFertility?: boolean;
}

export function CalendarView({ cycles, getPhaseForDate, dayLogs, onDayTap, hideFertility = false }: CalendarViewProps) {
  const nextPeriod = getNextPeriodDate(cycles);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      <h2 className="text-3xl font-serif font-bold">Calendar</h2>

      <div className="glass rounded-[2rem] p-5">
        <CalendarGrid
          getPhaseForDate={getPhaseForDate}
          dayLogs={dayLogs}
          onDayTap={onDayTap}
          hideFertility={hideFertility}
        />
      </div>

      {/* Legend */}
      <div className="glass rounded-3xl p-4 flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-menstrual" />
          <span className="text-xs text-ink/65">Period</span>
        </div>
        {!hideFertility && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-follicular" />
              <span className="text-xs text-ink/65">Fertile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-ovulation" />
              <span className="text-xs text-ink/65">Ovulation</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-luteal" />
          <span className="text-xs text-ink/65">Luteal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs text-ink/65">Logged</span>
        </div>
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
