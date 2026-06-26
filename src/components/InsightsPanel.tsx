import type { Insight } from '../types';
import { InsightCard } from './InsightCard';
import { useTranslation } from '../i18n';

interface InsightsPanelProps {
  insights: Insight[];
  hasEnoughData: boolean;
}

export function InsightsPanel({ insights, hasEnoughData }: InsightsPanelProps) {
  const { t } = useTranslation();
  if (!hasEnoughData) {
    return (
      <div className="glass rounded-[2rem] p-5 mt-6 text-center">
        <p className="text-xs text-ink/45">{t('insights.needMoreCycles')}</p>
      </div>
    );
  }

  return (
    <div className="w-full mt-6 space-y-3">
      <p className="text-xs text-ink/55 uppercase tracking-wider font-medium">
        {t('insights.yourPatterns')}
      </p>
      {insights.length === 0 ? (
        <div className="glass rounded-[2rem] p-5 text-center">
          <p className="text-xs text-ink/45">{t('insights.logRegularly')}</p>
        </div>
      ) : (
        insights.map((insight, i) => (
          <InsightCard key={insight.id} insight={insight} index={i} />
        ))
      )}
    </div>
  );
}
