import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Droplets, Moon, Zap, Frown, Pencil, Check, Play, Square } from 'lucide-react';
import { nice } from '../lib/cycle-math';
import { SymptomPills } from './SymptomPills';
import { useTranslation } from '../i18n';
import type { Cycle, DayLog, MoodValue, Severity, SleepQuality, FlowLevel } from '../types';

interface DayDetailSheetProps {
  open: boolean;
  date: string; // "YYYY-MM-DD"
  log: DayLog | undefined;
  phaseName: string;
  phaseColor: string;
  activeCycle: Cycle | null;
  /** True when this date already falls inside a recorded (closed) period. */
  dateInRecordedPeriod?: boolean;
  onStartPeriod: (date: string) => void;
  onEndPeriod: (date: string) => void;
  onClose: () => void;
  onUpdateLog: (date: string, log: Partial<DayLog>) => void;
}

const MOOD_KEYS: Record<MoodValue, string> = {
  anxious: 'moodAnxious',
  sad: 'moodSad',
  irritable: 'moodIrritable',
  energetic: 'moodEnergetic',
  calm: 'moodCalm',
  happy: 'moodHappy',
};

const FLOW_KEYS: Record<FlowLevel, string> = {
  spotting: 'flowSpotting',
  light: 'flowLight',
  medium: 'flowMedium',
  heavy: 'flowHeavy',
};

function SeverityBar({ value, max = 3 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${
            i < value ? 'bg-accent' : 'bg-ink/15'
          }`}
        />
      ))}
    </div>
  );
}

const SEVERITY_KEYS: Record<Severity, string> = { 1: 'detailLow', 2: 'detailMedium', 3: 'detailHigh' };
const SLEEP_KEYS: Record<SleepQuality, string> = { 1: 'sleepPoor', 2: 'sleepFair', 3: 'sleepGood' };

const PAIN_KEYS: Record<string, string> = {
  head: 'painHead',
  breast: 'painBreast',
  back: 'painBack',
  joints: 'painJoints',
};

export function DayDetailSheet({ open, date, log, phaseName, phaseColor, activeCycle, dateInRecordedPeriod = false, onStartPeriod, onEndPeriod, onClose, onUpdateLog }: DayDetailSheetProps) {
  const { t, locale } = useTranslation();
  const severityLabel = (v: Severity) => t(`symptoms.${SEVERITY_KEYS[v]}`);
  const sleepLabel = (v: SleepQuality) => t(`symptoms.${SLEEP_KEYS[v]}`);
  const [editing, setEditing] = useState(false);

  // Always reopen in read mode for a fresh day.
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  const hasData = log && (
    log.mood?.length ||
    log.energy ||
    log.cramps ||
    log.sleep ||
    log.flow ||
    log.pain ||
    log.note ||
    log.functionalImpact
  );

  // Period actions for this date: start one if none is active, or end the
  // active one on this day.
  const canStartPeriod = !activeCycle && !dateInRecordedPeriod;
  const canEndPeriod = !!activeCycle && date >= activeCycle.start;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
        >
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-lg glass rounded-t-[2rem] p-6 pb-[max(2.5rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-ink/15 mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-serif font-bold">{nice(date, locale)}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: phaseColor }}
                  />
                  <span className="text-sm text-ink/60">{phaseName}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label={t('common.close')}
                className="w-11 h-11 rounded-full bg-ink/[0.06] flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            {editing ? (
              <SymptomPills log={log} onUpdate={(partial) => onUpdateLog(date, partial)} />
            ) : hasData ? (
              <div className="space-y-4">
                {/* Flow */}
                {log.flow && (
                  <div className="flex items-center gap-3 glass rounded-2xl p-3">
                    <Droplets size={16} className="text-menstrual shrink-0" />
                    <span className="text-sm font-medium">{t('symptoms.flow')}</span>
                    <span className="text-sm text-ink/60 ml-auto">{t(`symptoms.${FLOW_KEYS[log.flow]}`)}</span>
                  </div>
                )}

                {/* Mood */}
                {log.mood && log.mood.length > 0 && (
                  <div className="glass rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Frown size={16} className="text-ovulation shrink-0" />
                      <span className="text-sm font-medium">{t('symptoms.mood')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-7">
                      {log.mood.map(m => (
                        <span key={m} className="text-xs bg-ink/[0.06] rounded-full px-3 py-1">
                          {t(`symptoms.${MOOD_KEYS[m]}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Energy */}
                {log.energy && (
                  <div className="flex items-center gap-3 glass rounded-2xl p-3">
                    <Zap size={16} className="text-follicular shrink-0" />
                    <span className="text-sm font-medium">{t('symptoms.energy')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-ink/55">{severityLabel(log.energy)}</span>
                      <SeverityBar value={log.energy} />
                    </div>
                  </div>
                )}

                {/* Cramps */}
                {log.cramps && (
                  <div className="flex items-center gap-3 glass rounded-2xl p-3">
                    <div className="w-4 h-4 shrink-0 flex items-center justify-center text-menstrual text-xs font-bold">~</div>
                    <span className="text-sm font-medium">{t('symptoms.cramps')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-ink/55">{severityLabel(log.cramps)}</span>
                      <SeverityBar value={log.cramps} />
                    </div>
                  </div>
                )}

                {/* Sleep */}
                {log.sleep && (
                  <div className="flex items-center gap-3 glass rounded-2xl p-3">
                    <Moon size={16} className="text-luteal shrink-0" />
                    <span className="text-sm font-medium">{t('symptoms.sleep')}</span>
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-ink/55">{sleepLabel(log.sleep)}</span>
                      <SeverityBar value={log.sleep} />
                    </div>
                  </div>
                )}

                {/* Pain */}
                {log.pain && log.pain.locations.length > 0 && (
                  <div className="glass rounded-2xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 shrink-0 flex items-center justify-center text-menstrual text-xs font-bold">!</div>
                      <span className="text-sm font-medium">{t('symptoms.pain')}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-ink/55">{severityLabel(log.pain.severity)}</span>
                        <SeverityBar value={log.pain.severity} />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-7">
                      {log.pain.locations.map(loc => (
                        <span key={loc} className="text-xs bg-ink/[0.06] rounded-full px-3 py-1">
                          {t(`symptoms.${PAIN_KEYS[loc]}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Functional Impact */}
                {log.functionalImpact && (
                  <div className="glass rounded-2xl p-3">
                    <span className="text-xs text-menstrual">{t('symptoms.impactAffected')}</span>
                  </div>
                )}

                {/* Note */}
                {log.note && (
                  <div className="glass rounded-2xl p-3">
                    <p className="text-sm text-ink/65 italic">{log.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-ink/45 text-sm">{t('symptoms.noSymptomsForDay')}</p>
              </div>
            )}

            {/* Period actions (hidden while editing symptoms) */}
            {!editing && (canStartPeriod || canEndPeriod) && (
              <div className="mt-6">
                {canStartPeriod && (
                  <button
                    onClick={() => onStartPeriod(date)}
                    className="w-full py-3.5 rounded-2xl bg-menstrual text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Play size={14} />
                    {t('sheet.startPeriodHere')}
                  </button>
                )}
                {canEndPeriod && (
                  <button
                    onClick={() => onEndPeriod(date)}
                    className="w-full py-3.5 rounded-2xl bg-menstrual text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Square size={14} />
                    {t('sheet.endPeriodOnDay')}
                  </button>
                )}
              </div>
            )}

            {/* Symptom edit toggle */}
            <button
              onClick={() => setEditing(e => !e)}
              className="w-full mt-3 py-3.5 rounded-2xl bg-ink/[0.06] hover:bg-ink/10 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {editing ? <Check size={14} /> : <Pencil size={14} />}
              {editing ? t('common.done') : hasData ? t('symptoms.editSymptoms') : t('symptoms.logSymptoms')}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
