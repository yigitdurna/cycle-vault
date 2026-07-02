import { motion } from 'motion/react';
import { X } from 'lucide-react';
import { CalendarGrid } from '../components/CalendarGrid';
import { SymptomPills } from '../components/SymptomPills';
import { ActivePeriodBanner } from '../components/ActivePeriodBanner';
import type { Cycle, PhaseResult, DayLog, DayLogs, CyclePhase } from '../types';
import { fromYmd, ymd, niceShort } from '../lib/cycle-math';
import { useTranslation } from '../i18n';

/** Dot + border colour for the next-period banner, keyed by the current phase
 *  so it matches the calendar legend (red stays exclusive to an active period). */
const PHASE_STYLE: Record<CyclePhase, { dot: string; border: string }> = {
  Menstrual: { dot: 'bg-menstrual', border: 'border-menstrual/30' },
  Follicular: { dot: 'bg-follicular', border: 'border-follicular/30' },
  Ovulation: { dot: 'bg-ovulation', border: 'border-ovulation/30' },
  Luteal: { dot: 'bg-luteal', border: 'border-luteal/30' },
};

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
  /** Today's UI phase — colours the next-period banner per the legend. */
  currentPhase: CyclePhase;
  /** Non-null when picking the end date for a period that starts on this day. */
  selectionStart: string | null;
  onRangeSelect: (date: string) => void;
  onStillOngoing: () => void;
  onCancelSelection: () => void;
}

export function CalendarView({
  getPhaseForDate, dayLogs, onDayTap, todayLog, onUpdateTodayLog, hideFertility = false,
  activeCycle, onEndCycle, nextPeriod, currentPhase,
  selectionStart, onRangeSelect, onStillOngoing, onCancelSelection,
}: CalendarViewProps) {
  const { t, locale } = useTranslation();
  const selecting = selectionStart !== null;
  const phaseStyle = PHASE_STYLE[currentPhase];

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
        <div className={`glass rounded-2xl p-4 flex items-center gap-3 border ${phaseStyle.border}`}>
          {/* Pulsing dot — mirrors the in-progress banner's "live" feel, but
              coloured by the current phase so red stays exclusive to a period. */}
          <span className="relative flex h-3 w-3 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${phaseStyle.dot} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${phaseStyle.dot}`} />
          </span>
          <div>
            <p className="text-sm font-semibold">
              {nextPeriod.daysToNext < 0
                ? t('calendar.periodOverdue', { count: -nextPeriod.daysToNext })
                : nextPeriod.daysToNext === 0
                ? t('calendar.periodExpectedToday')
                : t('calendar.nextPeriodIn', { count: nextPeriod.daysToNext })}
            </p>
            <p className="text-xs text-ink/55 mt-0.5">{t('calendar.around', { date: niceShort(nextPeriod.date, locale) })}</p>
          </div>
        </div>
      )}

      {/* End-date selection banner */}
      {selecting && (
        <div className="rounded-3xl p-4 bg-accent/15 border border-accent/30 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-accent">{t('calendar.pickEndDate')}</div>
            <div className="text-xs text-ink/65 mt-0.5">
              {t('calendar.periodStartingTap', { date: niceShort(selectionStart!, locale) })}
            </div>
          </div>
          <button
            onClick={onStillOngoing}
            className="px-3 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity"
          >
            {t('calendar.stillOngoing')}
          </button>
          <button
            onClick={onCancelSelection}
            aria-label={t('common.cancel')}
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
            // The end date can't be in the future — dim/disable those days. An
            // earlier tap (< start) is allowed: it re-anchors the start.
            isDateSelectable={(d) => ymd(d) <= ymd(new Date())}
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
          {/* Legend — hidden entirely when cycle indicators are off (only the
              period shows on the calendar, which needs no legend). */}
          {!hideFertility && (
            <div className="glass rounded-3xl p-4 flex flex-wrap justify-center gap-x-5 gap-y-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-menstrual" />
                <span className="text-xs font-medium text-ink/70">{t('calendar.legendPeriod')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-follicular" />
                <span className="text-xs font-medium text-ink/70">{t('calendar.legendFertile')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-ovulation" />
                <span className="text-xs font-medium text-ink/70">{t('calendar.legendOvulation')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-luteal" />
                <span className="text-xs font-medium text-ink/70">{t('calendar.legendLuteal')}</span>
              </div>
            </div>
          )}

          {/* Today's quick log */}
          <div className="glass rounded-[2rem] p-6">
            <SymptomPills log={todayLog} onUpdate={onUpdateTodayLog} />
          </div>
        </>
      )}
    </motion.div>
  );
}
