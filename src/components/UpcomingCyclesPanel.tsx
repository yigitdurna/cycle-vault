import { CalendarRange } from 'lucide-react';
import { fromYmd, niceShort, type UpcomingPeriod } from '../lib/cycle-math';
import { useTranslation } from '../i18n';

/**
 * Estimated upcoming period date ranges (start–end), for planning ahead
 * (holidays etc.). Clearly framed as approximate; sharpens as more cycles are
 * logged. Renders nothing until there's a prediction.
 */
export function UpcomingCyclesPanel({ upcoming }: { upcoming: UpcomingPeriod[] }) {
  const { t, locale } = useTranslation();
  if (upcoming.length === 0) return null;

  return (
    <div className="glass rounded-[2rem] p-6 mt-8 w-full">
      <div className="flex items-center gap-2 mb-4">
        <CalendarRange size={16} className="text-ink/60" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/55">
          {t('home.upcomingTitle')}
        </h3>
      </div>

      <div className="space-y-1.5">
        {upcoming.map(p => (
          <div key={p.start} className="flex items-center justify-between text-sm px-1 py-1">
            <span className="text-ink/75">
              {niceShort(p.start, locale)} – {niceShort(p.end, locale)}
            </span>
            <span className="text-ink/45 capitalize">
              {fromYmd(p.start).toLocaleDateString(locale, { weekday: 'short' })}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-ink/45 mt-3 px-1">{t('home.estimateNote')}</p>
    </div>
  );
}
