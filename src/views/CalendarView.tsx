import { motion } from 'motion/react';
import { X, Calendar as CalendarIcon, Droplets } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import { SymptomPills } from '../components/SymptomPills';
import { StatCard } from '../components/StatCard';
import { ActivePeriodBanner } from '../components/ActivePeriodBanner';
import { TodayInsightsPanel } from '../components/TodayInsightsPanel';
import { InsightsPanel } from '../components/InsightsPanel';
import type { Cycle, PhaseInfo, PhaseResult, Insight, DayLog, DayLogs } from '../types';
import { fromYmd, ymd, niceShort } from '../lib/cycle-math';

interface CalendarViewProps {
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  dayLogs?: DayLogs;
  onDayTap: (dateStr: string) => void;
  todayLog: DayLog | undefined;
  onUpdateTodayLog: (log: Partial<DayLog>) => void;
  hideFertility?: boolean;
  // --- summary (folded in from the former Dashboard) ---
  activeCycle: Cycle | null;
  onEndCycle: () => void;
  nextPeriod: { date: string; daysToNext: number } | null;
  cycleDay: number | null;
  todayUIPhase: PhaseInfo;
  todayInsights: Insight[];
  insights: Insight[];
  hasEnoughData: boolean;
  // --- guided period selection ---
  selectionStart: string | null;
  onRangeSelect: (date: string) => void;
  onStillOngoing: () => void;
  onCancelSelection: () => void;
}

export function CalendarView({
  getPhaseForDate, dayLogs, onDayTap, todayLog, onUpdateTodayLog, hideFertility = false,
  activeCycle, onEndCycle, nextPeriod, cycleDay, todayUIPhase, todayInsights, insights, hasEnoughData,
  selectionStart, onRangeSelect, onStillOngoing, onCancelSelection,
}: CalendarViewProps) {
  const selecting = selectionStart !== null;
  const hasCycles = cycleDay !== null || activeCycle !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Active period bar (only while a period is ongoing) */}
      {!selecting && activeCycle && (
        <ActivePeriodBanner activeCycle={activeCycle} onEndCycle={onEndCycle} />
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

          {/* At-a-glance summary */}
          {hasCycles && (
            <>
              <div className="flex items-center gap-2 px-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: todayUIPhase.color }} />
                <span className="text-sm font-medium">{todayUIPhase.name} phase</span>
              </div>
              <div className="flex gap-4">
                <StatCard
                  label="Next Period"
                  value={nextPeriod ? `${nextPeriod.daysToNext} ${nextPeriod.daysToNext === 1 ? 'Day' : 'Days'}` : '—'}
                  icon={CalendarIcon}
                />
                <StatCard
                  label="Cycle Day"
                  value={cycleDay ? `Day ${cycleDay}` : '—'}
                  icon={Droplets}
                />
              </div>
            </>
          )}

          {/* Today's quick log */}
          <div className="glass rounded-[2rem] p-6">
            <SymptomPills log={todayLog} onUpdate={onUpdateTodayLog} />
          </div>

          {/* Insights */}
          {hasCycles && <TodayInsightsPanel insights={todayInsights} />}
          {hasCycles && <InsightsPanel insights={insights} hasEnoughData={hasEnoughData} />}

          {!hasCycles && (
            <div className="glass rounded-[2rem] p-6 text-center">
              <p className="text-ink/60">Tap a date above to log your first period.</p>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}
