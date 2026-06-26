import { TrendingUp } from 'lucide-react';
import { getCycleHistoryStats, niceShort } from '../lib/cycle-math';
import type { Cycle } from '../types';

const REGULARITY_STYLE: Record<string, string> = {
  regular: 'bg-follicular/15 text-follicular',
  'mostly regular': 'bg-ovulation/15 text-ovulation',
  irregular: 'bg-menstrual/15 text-menstrual',
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ink/[0.04] rounded-2xl p-3 text-center">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] text-ink/55 mt-0.5">{label}</div>
    </div>
  );
}

export function CycleHistoryPanel({ cycles }: { cycles: Cycle[] }) {
  const s = getCycleHistoryStats(cycles);
  if (s.cycleCount === 0) return null;

  return (
    <div className="glass rounded-[2rem] p-6 mt-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-ink/60" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-ink/55">Your cycle history</h3>
        </div>
        {s.regularity && (
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${REGULARITY_STYLE[s.regularity]}`}>
            {s.regularity}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Avg cycle" value={s.medianCycle ? `${s.medianCycle}d` : '—'} />
        <Stat label="Avg period" value={s.avgPeriod ? `${s.avgPeriod}d` : '—'} />
        <Stat
          label="Range"
          value={s.shortestCycle && s.longestCycle ? `${s.shortestCycle}–${s.longestCycle}d` : '—'}
        />
      </div>

      {/* Recent cycles */}
      <div className="mt-4 space-y-1.5">
        <div className="text-[11px] text-ink/45 uppercase tracking-wider font-medium px-1">Recent</div>
        {s.recent.map((c) => (
          <div key={c.start} className="flex items-center justify-between text-sm px-1 py-1">
            <span className="text-ink/75">
              {niceShort(c.start)}{c.end ? ` – ${niceShort(c.end)}` : ''}
            </span>
            <span className="text-ink/55 tabular-nums">
              {c.length ? `${c.length}-day cycle` : 'current'}
            </span>
          </div>
        ))}
        <p className="text-[11px] text-ink/45 px-1 pt-1">
          {s.cycleCount} {s.cycleCount === 1 ? 'cycle' : 'cycles'} tracked
        </p>
      </div>
    </div>
  );
}
