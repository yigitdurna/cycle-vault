import { useState, useRef } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { ymd } from '../lib/cycle-math';
import { useTranslation } from '../i18n';
import { dayLogHasData } from '../hooks/useDayLogs';
import type { PhaseResult, DayLogs } from '../types';

interface CalendarGridProps {
  getPhaseForDate: (dateStr: string) => PhaseResult | null;
  /** Range selection mode for logging periods */
  selectable?: boolean;
  selectedRange?: [Date | null, Date | null];
  onSelectDate?: (date: Date) => void;
  /** Symptom logs keyed by YYYY-MM-DD */
  dayLogs?: DayLogs;
  /** Called when a day is tapped (non-selectable mode) */
  onDayTap?: (dateStr: string) => void;
  /** Hide cycle indicators: when on, the calendar shows only the period — no
   *  fertile / ovulation / luteal dots. */
  hideFertility?: boolean;
}

/** Period days get a strong fill (recorded) or a soft fill (predicted). Other
 *  phases get no fill — only a small dot — to keep the grid clean. */
function getPeriodFill(phase: PhaseResult | null): string {
  if (!phase || phase.type !== 'period') return '';
  return phase.recorded
    ? 'bg-menstrual text-white font-semibold'
    : 'bg-menstrual/25 text-menstrual font-semibold';
}

/** Small indicator dot for non-period phases. With indicators hidden, no dots
 *  show at all — the calendar shows only the period. */
function getPhaseDot(phase: PhaseResult | null, hideFertility: boolean): string | null {
  if (!phase || hideFertility) return null;
  switch (phase.type) {
    case 'fertile': return 'bg-follicular';
    case 'ovulation': return 'bg-ovulation';
    case 'luteal': return 'bg-luteal';
    default: return null;
  }
}

export function CalendarGrid({ getPhaseForDate, selectable, selectedRange, onSelectDate, dayLogs, onDayTap, hideFertility = false }: CalendarGridProps) {
  const { t, locale } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const touchStartX = useRef(0);

  const DAY_HEADERS = [
    t('calendar.weekdaySun'),
    t('calendar.weekdayMon'),
    t('calendar.weekdayTue'),
    t('calendar.weekdayWed'),
    t('calendar.weekdayThu'),
    t('calendar.weekdayFri'),
    t('calendar.weekdaySat'),
  ];

  const today = new Date();
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const isInRange = (date: Date) => {
    if (!selectable || !selectedRange) return false;
    const [start, end] = selectedRange;
    if (start && end) {
      return date >= start && date <= end;
    }
    if (start) {
      return isSameDay(date, start);
    }
    return false;
  };

  return (
    <div
      onTouchStart={(e) => { touchStartX.current = e.changedTouches[0].screenX; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].screenX - touchStartX.current;
        if (Math.abs(dx) > 50) {
          if (dx < 0) setCurrentMonth(addMonths(currentMonth, 1));
          else setCurrentMonth(subMonths(currentMonth, 1));
        }
      }}
    >
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          aria-label={t('calendar.prevMonth')}
          className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-ink/[0.06] transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-base font-serif font-bold">
          {currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          aria-label={t('calendar.nextMonth')}
          className="w-11 h-11 rounded-full flex items-center justify-center hover:bg-ink/[0.06] transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center mb-2">
        {DAY_HEADERS.map((h, i) => (
          <div key={i} className="text-[11px] text-ink/45 font-bold">{h}</div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => {
          const inMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, today);
          const dateStr = ymd(day);
          const phase = inMonth ? getPhaseForDate(dateStr) : null;
          const periodFill = getPeriodFill(phase);
          const dot = getPhaseDot(phase, hideFertility);
          const inRange = isInRange(day);
          const hasSymptom = inMonth && dayLogs && dayLogHasData(dayLogs[dateStr]);
          const tappable = !selectable && onDayTap && inMonth;

          return (
            <button
              key={i}
              onClick={() => {
                if (selectable) {
                  onSelectDate?.(day);
                } else if (tappable) {
                  onDayTap(dateStr);
                }
              }}
              disabled={!selectable && !tappable}
              className={cn(
                'aspect-square min-h-[42px] rounded-2xl flex flex-col items-center justify-center text-[15px] relative transition-colors',
                !inMonth && 'opacity-30',
                inMonth && !inRange && periodFill,
                inRange && 'bg-ink/15 ring-1 ring-ink/30',
                isToday && 'ring-2 ring-accent',
                selectable && inMonth && 'hover:bg-ink/[0.06] cursor-pointer',
                tappable && 'cursor-pointer active:bg-ink/[0.04]',
              )}
            >
              {format(day, 'd')}
              {/* Indicators: symptom dot wins; else a small phase dot. */}
              {hasSymptom ? (
                <div className="absolute bottom-1 w-2 h-2 rounded-full bg-accent" />
              ) : dot && !periodFill ? (
                <div className={cn('absolute bottom-1 w-2 h-2 rounded-full', dot)} />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
