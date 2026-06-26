import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Droplets } from 'lucide-react';
import { CycleRing } from '../components/CycleRing';
import { ActivePeriodBanner } from '../components/ActivePeriodBanner';
import { StatCard } from '../components/StatCard';
import { PhaseCard } from '../components/PhaseCard';
import { TodayInsightsPanel } from '../components/TodayInsightsPanel';
import { InsightsPanel } from '../components/InsightsPanel';
import { CycleHistoryPanel } from '../components/CycleHistoryPanel';
import type { PhaseInfo, PhaseResult, Insight, CyclePhase } from '../types';
import type { Cycle } from '../types';
import { getCycleStats } from '../lib/cycle-math';
import { useTranslation } from '../i18n';

interface HomeViewProps {
  todayPhase: PhaseResult | null;
  todayUIPhase: PhaseInfo;
  nextPeriod: { date: string; daysToNext: number } | null;
  cycleDay: number | null;
  cycles: Cycle[];
  todayInsights: Insight[];
  insights: Insight[];
  hasEnoughData: boolean;
  getPhaseDescription: (phase: CyclePhase) => string | null;
  customCycleLength: number;
  activeCycle: Cycle | null;
  onEndCycle: () => void;
}

export function HomeView({ todayPhase, todayUIPhase, nextPeriod, cycleDay, cycles, todayInsights, insights, hasEnoughData, getPhaseDescription, customCycleLength, activeCycle, onEndCycle }: HomeViewProps) {
  const { t } = useTranslation();
  const stats = getCycleStats(cycles, customCycleLength);
  const totalDays = stats?.med ?? customCycleLength;
  const displayDay = cycleDay ?? 1;

  let phaseSubtitle: string | undefined;
  if (todayPhase) {
    if (todayPhase.type === 'period') {
      phaseSubtitle = t('home.periodDay', { day: todayPhase.day ?? 1 });
    }
  }

  const hasCycles = cycles.length > 0;

  // Replace static phase description with personalized one when available
  const personalDesc = getPhaseDescription(todayUIPhase.name);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center"
    >
      {activeCycle && (
        <ActivePeriodBanner activeCycle={activeCycle} onEndCycle={onEndCycle} />
      )}

      <CycleRing day={displayDay} totalDays={totalDays} phaseInfo={todayUIPhase} />

      <div className="w-full flex gap-4 mt-12">
        <StatCard
          label={t('home.nextPeriod')}
          value={hasCycles && nextPeriod ? t('home.nextPeriodDay', { count: nextPeriod.daysToNext }) : '—'}
          icon={CalendarIcon}
        />
        <StatCard
          label={t('home.cycleDay')}
          value={hasCycles && cycleDay ? t('home.cycleDayValue', { day: cycleDay }) : '—'}
          icon={Droplets}
        />
      </div>

      {hasCycles && (
        <TodayInsightsPanel insights={todayInsights} />
      )}

      {hasCycles && (
        <InsightsPanel insights={insights} hasEnoughData={hasEnoughData} />
      )}

      {hasCycles && <CycleHistoryPanel cycles={cycles} />}

      {hasCycles ? (
        <PhaseCard phaseInfo={todayUIPhase} description={personalDesc ?? undefined} subtitle={phaseSubtitle} />
      ) : (
        <div className="glass rounded-[2rem] p-6 mt-8 text-center">
          <p className="text-ink/60">{t('home.headToCalendar')}</p>
        </div>
      )}
    </motion.div>
  );
}
