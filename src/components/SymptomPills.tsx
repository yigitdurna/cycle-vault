import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smile, Zap, Flame, Droplets, Activity, MessageSquare, Check, X } from 'lucide-react';
import type { DayLog, MoodValue, Severity, FlowLevel } from '../types';
import { useTranslation } from '../i18n';

interface SymptomPillsProps {
  log: DayLog | undefined;
  onUpdate: (log: Partial<DayLog>) => void;
}

type PopoverId = 'mood' | 'energy' | 'cramps' | 'flow' | 'pain' | null;

const MOODS: { value: MoodValue }[] = [
  { value: 'anxious' },
  { value: 'sad' },
  { value: 'irritable' },
  { value: 'energetic' },
  { value: 'calm' },
  { value: 'happy' },
];

const FLOW_LEVELS: { value: FlowLevel; labelKey: string }[] = [
  { value: 'spotting', labelKey: 'flowSpotting' },
  { value: 'light', labelKey: 'flowLight' },
  { value: 'medium', labelKey: 'flowMedium' },
  { value: 'heavy', labelKey: 'flowHeavy' },
];

const ENERGY_LEVELS: { value: Severity; labelKey: string }[] = [
  { value: 1, labelKey: 'energyLow' },
  { value: 2, labelKey: 'energyModerate' },
  { value: 3, labelKey: 'energyHigh' },
];

const CRAMPS_LEVELS: { value: Severity; labelKey: string }[] = [
  { value: 1, labelKey: 'severityMild' },
  { value: 2, labelKey: 'severityModerate' },
  { value: 3, labelKey: 'severitySevere' },
];

const PAIN_LOCATIONS = ['head', 'breast', 'back', 'joints'] as const;
const PAIN_LOCATION_KEYS: Record<typeof PAIN_LOCATIONS[number], string> = {
  head: 'painHead',
  breast: 'painBreast',
  back: 'painBack',
  joints: 'painJoints',
};
const SEVERITY_KEYS: Record<Severity, string> = { 1: 'severityMild', 2: 'severityModerate', 3: 'severitySevere' };
const MOOD_KEYS: Record<MoodValue, string> = {
  anxious: 'moodAnxious',
  sad: 'moodSad',
  irritable: 'moodIrritable',
  energetic: 'moodEnergetic',
  calm: 'moodCalm',
  happy: 'moodHappy',
};

function Pill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 ${
        active
          ? 'bg-accent/20 border-accent/40 text-accent'
          : 'bg-ink/[0.05] border-ink/[0.08] text-ink/65'
      }`}
    >
      <Icon size={14} />
      <span>{label}</span>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5" />}
    </button>
  );
}

function Popover({
  open,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="glass rounded-2xl p-3 mt-2 w-full">
      {children}
    </div>
  );
}

function draftFromLog(log: DayLog | undefined): Partial<DayLog> {
  if (!log) return {};
  return {
    mood: log.mood,
    energy: log.energy,
    cramps: log.cramps,
    sleep: log.sleep,
    flow: log.flow,
    pain: log.pain,
    functionalImpact: log.functionalImpact,
    note: log.note,
  };
}

function draftsEqual(a: Partial<DayLog>, b: Partial<DayLog>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function OptionButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-accent/20 border-accent/40 text-accent'
          : 'bg-ink/[0.05] border-ink/[0.08] text-ink/60'
      }`}
    >
      {label}
    </button>
  );
}

export function SymptomPills({ log, onUpdate }: SymptomPillsProps) {
  const { t } = useTranslation();
  const [openPopover, setOpenPopover] = useState<PopoverId>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [draft, setDraft] = useState<Partial<DayLog>>(() => draftFromLog(log));

  useEffect(() => {
    setDraft(draftFromLog(log));
    setNoteText('');
    setNoteOpen(false);
  }, [log]);

  const isDirty = !draftsEqual(draft, draftFromLog(log));

  const flashSaved = useCallback(() => {
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const handleSave = useCallback(() => {
    onUpdate(draft);
    flashSaved();
  }, [draft, onUpdate, flashSaved]);

  useEffect(() => {
    if (noteOpen && noteRef.current) {
      noteRef.current.focus();
    }
  }, [noteOpen]);

  const toggle = (id: PopoverId) => {
    setOpenPopover(prev => (prev === id ? null : id));
  };

  // --- Draft mutators ---

  const toggleMood = (mood: MoodValue) => {
    const current = draft.mood ?? [];
    const next = current.includes(mood)
      ? current.filter(m => m !== mood)
      : [...current, mood];
    setDraft(d => ({ ...d, mood: next.length > 0 ? next : undefined }));
  };

  const selectEnergy = (level: Severity) => {
    setDraft(d => ({ ...d, energy: d.energy === level ? undefined : level }));
  };

  const selectCramps = (level: Severity) => {
    setDraft(d => ({ ...d, cramps: d.cramps === level ? undefined : level }));
  };

  const selectFlow = (level: FlowLevel) => {
    setDraft(d => ({ ...d, flow: d.flow === level ? undefined : level }));
  };

  const togglePainLocation = (loc: typeof PAIN_LOCATIONS[number]) => {
    const current = draft.pain;
    const locations = current?.locations ?? [];
    const severity = current?.severity ?? 1;
    const next = locations.includes(loc)
      ? locations.filter(l => l !== loc)
      : [...locations, loc];
    if (next.length === 0) {
      setDraft(d => { const { pain: _, ...rest } = d; return rest; });
    } else {
      setDraft(d => ({ ...d, pain: { locations: next, severity } }));
    }
  };

  const setPainSeverity = (s: Severity) => {
    const current = draft.pain;
    if (!current || current.locations.length === 0) return;
    setDraft(d => ({ ...d, pain: { ...current, severity: s } }));
  };

  const setImpact = (value: boolean) => {
    setDraft(d => ({ ...d, functionalImpact: d.functionalImpact === value ? undefined : value }));
  };


  const energyLabel = draft.energy ? t(`symptoms.${ENERGY_LEVELS[draft.energy - 1].labelKey}`) : t('symptoms.energy');
  const crampsLabel = draft.cramps ? t(`symptoms.${CRAMPS_LEVELS[draft.cramps - 1].labelKey}`) : t('symptoms.cramps');

  return (
    <div className="w-full mt-8">
      <p className="text-sm text-ink/55 font-medium mb-4">
        {t('symptoms.howFeeling')}
      </p>

      {/* Pill row */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <Pill icon={Smile} label={t('symptoms.mood')} active={!!draft.mood?.length} onClick={() => toggle('mood')} />
        <Pill icon={Zap} label={energyLabel} active={!!draft.energy} onClick={() => toggle('energy')} />
        <Pill icon={Flame} label={crampsLabel} active={!!draft.cramps} onClick={() => toggle('cramps')} />
        <Pill icon={Droplets} label={t('symptoms.flow')} active={!!draft.flow} onClick={() => toggle('flow')} />
        <Pill icon={Activity} label={t('symptoms.pain')} active={!!draft.pain} onClick={() => toggle('pain')} />
      </div>

      {/* Mood popover */}
      <Popover open={openPopover === 'mood'} onClose={() => setOpenPopover(null)}>
        <div className="flex flex-wrap gap-2">
          {MOODS.map(m => (
            <OptionButton key={m.value} label={t(`symptoms.${MOOD_KEYS[m.value]}`)} active={draft.mood?.includes(m.value) ?? false} onClick={() => toggleMood(m.value)} />
          ))}
        </div>
      </Popover>

      {/* Energy popover */}
      <Popover open={openPopover === 'energy'} onClose={() => setOpenPopover(null)}>
        <div className="flex flex-wrap gap-2">
          {ENERGY_LEVELS.map(e => (
            <OptionButton key={e.value} label={t(`symptoms.${e.labelKey}`)} active={draft.energy === e.value} onClick={() => selectEnergy(e.value)} />
          ))}
        </div>
      </Popover>

      {/* Cramps popover */}
      <Popover open={openPopover === 'cramps'} onClose={() => setOpenPopover(null)}>
        <div className="flex flex-wrap gap-2">
          {CRAMPS_LEVELS.map(c => (
            <OptionButton key={c.value} label={t(`symptoms.${c.labelKey}`)} active={draft.cramps === c.value} onClick={() => selectCramps(c.value)} />
          ))}
        </div>
      </Popover>

      {/* Flow popover */}
      <Popover open={openPopover === 'flow'} onClose={() => setOpenPopover(null)}>
        <div className="flex flex-wrap gap-2">
          {FLOW_LEVELS.map(f => (
            <OptionButton key={f.value} label={t(`symptoms.${f.labelKey}`)} active={draft.flow === f.value} onClick={() => selectFlow(f.value)} />
          ))}
        </div>
      </Popover>

      {/* Pain popover */}
      <Popover open={openPopover === 'pain'} onClose={() => setOpenPopover(null)}>
        <p className="text-xs text-ink/55 mb-2">{t('symptoms.locationLabel')}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {PAIN_LOCATIONS.map(loc => (
            <OptionButton key={loc} label={t(`symptoms.${PAIN_LOCATION_KEYS[loc]}`)} active={draft.pain?.locations.includes(loc) ?? false} onClick={() => togglePainLocation(loc)} />
          ))}
        </div>
        {draft.pain && draft.pain.locations.length > 0 && (
          <>
            <p className="text-xs text-ink/55 mb-2">{t('symptoms.severityLabel')}</p>
            <div className="flex gap-2">
              {([1, 2, 3] as Severity[]).map(s => (
                <OptionButton key={s} label={t(`symptoms.${SEVERITY_KEYS[s]}`)} active={draft.pain?.severity === s} onClick={() => setPainSeverity(s)} />
              ))}
            </div>
          </>
        )}
      </Popover>

      {/* Functional impact */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-ink/55">{t('symptoms.impactQuestion')}</p>
        <div className="flex gap-2">
          <OptionButton label={t('common.yes')} active={draft.functionalImpact === true} onClick={() => setImpact(true)} />
          <OptionButton label={t('common.no')} active={draft.functionalImpact === false} onClick={() => setImpact(false)} />
        </div>
      </div>

      {/* Note */}
      <div className="mt-3 space-y-2">
        {/* Existing saved note — always visible if present */}
        {draft.note && (
          <div className="glass rounded-xl px-3 py-2">
            <div className="flex items-start gap-2">
              <MessageSquare size={12} className="text-ink/45 mt-0.5 shrink-0" />
              <p className="text-xs text-ink/65 leading-relaxed flex-1">{draft.note}</p>
              <button
                onClick={() => setDraft(d => { const { note: _, ...rest } = d; return rest; })}
                className="text-ink/35 hover:text-ink/60 transition-colors shrink-0 mt-0.5"
                aria-label={t('symptoms.deleteNote')}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Add-more input */}
        {!noteOpen ? (
          <button
            onClick={() => setNoteOpen(true)}
            className="flex items-center gap-1.5 text-xs text-ink/55 hover:text-ink/65 transition-colors"
          >
            <MessageSquare size={12} />
            <span>{draft.note ? t('symptoms.addMore') : t('symptoms.addNote')}</span>
          </button>
        ) : (
          <textarea
            ref={noteRef}
            value={noteText}
            onChange={e => setNoteText(e.target.value.slice(0, 500))}
            onBlur={() => {
              const trimmed = noteText.trim();
              if (trimmed) {
                // Append to existing note rather than replace
                const existing = draft.note?.trim();
                const combined = existing ? `${existing}\n${trimmed}` : trimmed;
                setDraft(d => ({ ...d, note: combined }));
              }
              setNoteText('');
              setNoteOpen(false);
            }}
            placeholder={t('symptoms.notePlaceholder')}
            maxLength={500}
            rows={2}
            className="w-full bg-ink/[0.05] border border-ink/[0.08] rounded-xl px-3 py-2 text-sm text-ink/80 placeholder:text-ink/45 focus:outline-none focus:border-accent/40 resize-none"
          />
        )}
      </div>

      {/* Save button + animation */}
      <div className="mt-5 flex justify-center">
        <AnimatePresence mode="wait">
          {saved ? (
            <motion.div
              key="saved"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 text-accent/70"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
              >
                <Check size={16} />
              </motion.div>
              <span className="text-sm font-medium">{t('common.saved')}</span>
            </motion.div>
          ) : isDirty ? (
            <motion.button
              key="save-btn"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onClick={handleSave}
              className="px-8 py-2.5 rounded-full bg-accent/20 border border-accent/40 text-sm font-medium text-accent hover:bg-accent/30 transition-colors"
            >
              {t('common.save')}
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
