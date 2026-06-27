import { Droplets } from 'lucide-react';

/**
 * App mark: the same droplet-in-a-ring motif used for the in-progress cycle
 * countdown, with a soft pulsing red "recording" glow. Echoes the live feel of
 * an ongoing period rather than a static logo.
 */
export function Logo({ size = 32 }: { size?: number }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const progress = 0.72; // partial arc — reads as an active countdown ring

  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Pulsing recording glow */}
      <span className="absolute inset-0 rounded-full bg-menstrual/25 blur-[6px] animate-pulse" />
      <svg viewBox="0 0 36 36" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-ink/10" />
        <circle
          cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" strokeLinecap="round"
          className="stroke-menstrual"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
        />
      </svg>
      <Droplets size={size * 0.42} className="text-menstrual relative" />
    </div>
  );
}
