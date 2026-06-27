import { motion } from 'motion/react';
import { TrendingUp, AlertTriangle, BarChart3, Calendar } from 'lucide-react';
import type { Insight } from '../types';
import { useTranslation } from '../i18n';

const CATEGORY_CONFIG = {
  pattern: { icon: BarChart3, color: 'text-follicular' },
  anomaly: { icon: AlertTriangle, color: 'text-ovulation' },
  'cycle-length': { icon: Calendar, color: 'text-menstrual' },
  prediction: { icon: TrendingUp, color: 'text-luteal' },
} as const;

interface TodayInsightsPanelProps {
  insights: Insight[];
}

export function TodayInsightsPanel({ insights }: TodayInsightsPanelProps) {
  const { t } = useTranslation();
  if (insights.length === 0) return null;

  return (
    <div className="w-full mt-6">
      <p className="text-xs text-ink/55 uppercase tracking-wider font-medium mb-3">
        {t('insights.today')}
      </p>
      {/* Compact, glanceable chips — title only, no long descriptions. */}
      <div className="flex gap-2 flex-wrap">
        {insights.map((insight, i) => {
          const config = CATEGORY_CONFIG[insight.category];
          const Icon = config.icon;
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass rounded-2xl px-3.5 py-2.5 flex items-center gap-2"
            >
              <Icon size={14} className={`${config.color} shrink-0`} />
              <p className="text-xs font-medium leading-snug">{insight.title}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
