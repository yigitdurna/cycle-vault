import { motion } from 'motion/react';
import { diff, ymd, nice } from '../lib/cycle-math';
import type { Cycle } from '../types';
import { useTranslation } from '../i18n';

interface ActivePeriodBannerProps {
  activeCycle: Cycle;
  onEndCycle: () => void;
}

export function ActivePeriodBanner({ activeCycle, onEndCycle }: ActivePeriodBannerProps) {
  const { t, locale } = useTranslation();
  const today = ymd(new Date());
  const dayCount = diff(today, activeCycle.start) + 1;

  return (
    <motion.button
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onEndCycle}
      className="w-full mb-8 glass rounded-2xl p-4 flex items-center justify-between border border-menstrual/30 text-left"
    >
      <div className="flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-menstrual opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-menstrual" />
        </span>
        <div>
          <p className="text-sm font-medium">{t('home.bannerOngoing', { count: dayCount })}</p>
          <p className="text-xs text-ink/55">{t('home.bannerStarted', { date: nice(activeCycle.start, locale) })}</p>
        </div>
      </div>
      <span className="text-xs text-ink/60 bg-ink/[0.05] px-3 py-1.5 rounded-xl">
        {t('home.bannerEnd')}
      </span>
    </motion.button>
  );
}
