import { useState, useRef, useEffect, useCallback } from 'react';
import type { ComponentType } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Trash2, FileJson, FileSpreadsheet, Shield, Share2, RefreshCw, Check, FileText, Bell, ChevronRight } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { cn } from '../lib/utils';
import { requestNotificationPermission } from '../lib/notifications';
import { loadSampleData } from '../lib/sampleData';
import { useTranslation, LOCALE_LABELS, type Locale } from '../i18n';
import type { Cycle, NotificationSettings, LeadDay } from '../types';

const LEAD_DAY_OPTIONS: LeadDay[] = [1, 2, 3, 5, 7];
const LOCALE_OPTIONS: Locale[] = ['en', 'tr', 'de'];

/** Section: small label + a card of compact rows with hairline dividers. */
function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/45 px-1">{title}</h3>}
      <div className="glass rounded-3xl overflow-hidden divide-y divide-ink/[0.06]">{children}</div>
    </div>
  );
}

/** Compact tappable/link row. */
function ActionRow({ icon: Icon, label, sub, onClick, href, disabled, danger }: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string; sub?: string; onClick?: () => void; href?: string; disabled?: boolean; danger?: boolean;
}) {
  const cls = cn(
    'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
    danger ? 'hover:bg-menstrual/10' : 'hover:bg-ink/[0.04]',
    disabled && 'opacity-30 pointer-events-none',
  );
  const inner = (
    <>
      <Icon size={18} className={cn('shrink-0', danger ? 'text-menstrual' : 'text-ink/60')} />
      <div className="min-w-0 flex-1">
        <div className={cn('text-sm font-medium', danger && 'text-menstrual')}>{label}</div>
        {sub && <div className="text-xs text-ink/55 truncate">{sub}</div>}
      </div>
      <ChevronRight size={15} className="text-ink/30 shrink-0" />
    </>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
    : <button onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
}

/** Small on/off switch. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn('relative w-12 h-7 rounded-full shrink-0 transition-colors', checked ? 'bg-accent' : 'bg-ink/15')}
    >
      <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform', checked && 'translate-x-5')} />
    </button>
  );
}

/** Label + trailing toggle. */
function Row({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-sm">{label}</div>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** A labelled cluster of reminder rows (Before / During / After …). */
function ReminderGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="text-[11px] uppercase tracking-wider text-ink/45 font-medium">{label}</div>
      {children}
    </div>
  );
}

interface SettingsViewProps {
  cycles: Cycle[];
  onExportJSON: () => void;
  onExportCSV: () => void;
  onImportCSV: (file: File) => Promise<number>;
  onImportJSON: (file: File) => Promise<number>;
  onClearAll: () => void;
  shareSummary?: string;
  customCycleLength: number | undefined;
  onSetCycleLength: (v: number | undefined) => void;
  computedCycleLength: number | undefined;
  hideFertility: boolean;
  onSetHideFertility: (v: boolean) => void;
  /** True if there is any data at all (cycles OR symptom logs). */
  hasData: boolean;
  notifications: NotificationSettings;
  onSetNotifications: (patch: Partial<NotificationSettings>) => void;
  locale: Locale;
  onSetLocale: (l: Locale) => void;
}

export function SettingsView({ cycles, onExportJSON, onExportCSV, onImportCSV, onImportJSON, onClearAll, shareSummary, customCycleLength, onSetCycleLength, computedCycleLength, hideFertility, onSetHideFertility, hasData, notifications, onSetNotifications, locale, onSetLocale }: SettingsViewProps) {
  const { t } = useTranslation();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Cycle length input — raw string to avoid mid-type clamping
  const [cycleLengthInput, setCycleLengthInput] = useState(customCycleLength?.toString() ?? '');
  const [cycleSaved, setCycleSaved] = useState(false);
  const cycleSavedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setCycleLengthInput(customCycleLength?.toString() ?? '');
  }, [customCycleLength]);

  const isCycleDirty = cycleLengthInput !== (customCycleLength?.toString() ?? '');

  const saveCycleLength = useCallback(() => {
    const v = parseInt(cycleLengthInput, 10);
    if (cycleLengthInput === '') {
      onSetCycleLength(undefined);
    } else if (!isNaN(v)) {
      const clamped = Math.min(60, Math.max(15, v));
      setCycleLengthInput(clamped.toString());
      onSetCycleLength(clamped);
    }
    setCycleSaved(true);
    clearTimeout(cycleSavedTimer.current);
    cycleSavedTimer.current = setTimeout(() => setCycleSaved(false), 2000);
  }, [cycleLengthInput, onSetCycleLength]);

  // Reminder time — local string, commit on blur (project convention).
  const [timeInput, setTimeInput] = useState(notifications.reminderTime);
  useEffect(() => { setTimeInput(notifications.reminderTime); }, [notifications.reminderTime]);
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  const handleEnableNotifications = async (on: boolean) => {
    if (!on) { onSetNotifications({ enabled: false }); return; }
    const granted = await requestNotificationPermission();
    if (granted) { onSetNotifications({ enabled: true }); setNotifMsg(null); }
    else { setNotifMsg(t('settings.notifPermissionHint')); }
  };

  const toggleLeadDay = (d: LeadDay) => {
    const next = notifications.leadDays.includes(d)
      ? notifications.leadDays.filter(x => x !== d)
      : [...notifications.leadDays, d].sort((a, b) => a - b);
    onSetNotifications({ leadDays: next });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const count = await onImportCSV(file);
    setImportMsg(count > 0 ? t('settings.importedCycles', { count }) : t('settings.noNewCycles'));
    setTimeout(() => setImportMsg(null), 3000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShare = async () => {
    if (!shareSummary) return;
    if (navigator.share) {
      try { await navigator.share({ text: shareSummary }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareSummary);
      setImportMsg(t('settings.summaryCopied'));
      setTimeout(() => setImportMsg(null), 3000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <h2 className="text-3xl font-serif font-bold">{t('settings.title')}</h2>

      {/* Privacy — slim line */}
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 border border-follicular/15">
        <Shield size={18} className="text-follicular shrink-0" />
        <p className="text-xs text-ink/65">
          {t('settings.privacyBannerShort')}
        </p>
      </div>

      {/* Preferences */}
      <Group title={t('settings.sectionPreferences')}>
        {/* Language */}
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="text-sm font-medium">{t('settings.language')}</div>
          <div className="flex gap-1.5 shrink-0">
            {LOCALE_OPTIONS.map(l => (
              <button
                key={l}
                onClick={() => onSetLocale(l)}
                aria-pressed={locale === l}
                className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  locale === l ? 'bg-accent text-white border-accent' : 'bg-ink/[0.05] text-ink/60 border-ink/[0.08]')}
              >
                {LOCALE_LABELS[l]}
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-3 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium">{t('settings.avgCycleLength')}</div>
              <div className="text-xs text-ink/55 mt-0.5">
                {computedCycleLength ? t('settings.computedFromData', { count: computedCycleLength }) : t('settings.usedUntilEnough')}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="number" min={15} max={60}
                value={cycleLengthInput}
                onChange={e => setCycleLengthInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCycleLength()}
                placeholder="28"
                className="w-14 bg-ink/[0.05] border border-ink/[0.08] rounded-xl px-2 py-1.5 text-sm text-center text-ink/80 focus:outline-none focus:border-accent/40"
              />
              <span className="text-xs text-ink/55">{t('settings.daysUnit')}</span>
            </div>
          </div>
          <AnimatePresence mode="wait">
            {cycleSaved ? (
              <motion.div key="saved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-accent text-xs font-medium">
                <Check size={13} /> {t('common.saved')}
              </motion.div>
            ) : isCycleDirty ? (
              <motion.button key="save" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                onClick={saveCycleLength}
                className="px-4 py-1.5 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity">
                {t('common.save')}
              </motion.button>
            ) : customCycleLength ? (
              <button onClick={() => { onSetCycleLength(undefined); setCycleLengthInput(''); }}
                className="flex items-center gap-1.5 text-xs text-ink/45 hover:text-ink/65 transition-colors">
                <RefreshCw size={12} /> {t('settings.resetToDefault')}
              </button>
            ) : null}
          </AnimatePresence>
        </div>
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium">{t('settings.hideFertilityTitle')}</div>
            <div className="text-xs text-ink/55 mt-0.5">{t('settings.hideFertilityShort')}</div>
          </div>
          <Toggle checked={hideFertility} onChange={onSetHideFertility} label={t('settings.hideFertilityAria')} />
        </div>
      </Group>

      {/* Reminders */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink/45 px-1">{t('settings.sectionReminders')}</h3>
        <div className="glass rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium flex items-center gap-2"><Bell size={15} /> {t('settings.notifications')}</div>
              <div className="text-xs text-ink/55 mt-0.5">{t('settings.notifOnDevice')}</div>
            </div>
            <Toggle checked={notifications.enabled} onChange={handleEnableNotifications} label={t('settings.enableNotifAria')} />
          </div>

          {notifMsg && <p className="text-xs text-menstrual">{notifMsg}</p>}

          {notifications.enabled && (
            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium">{t('settings.reminderTime')}</div>
                <input
                  type="time" value={timeInput}
                  onChange={e => setTimeInput(e.target.value)}
                  onBlur={() => onSetNotifications({ reminderTime: timeInput || '09:00' })}
                  className="bg-ink/[0.05] border border-ink/[0.08] rounded-xl px-2 py-1.5 text-sm text-ink/80 focus:outline-none focus:border-accent/40"
                />
              </div>

              <ReminderGroup label={t('settings.groupBefore')}>
                <Row label={t('settings.reminderUpcoming')} checked={notifications.upcomingPeriod} onChange={v => onSetNotifications({ upcomingPeriod: v })} />
                {notifications.upcomingPeriod && (
                  <div className="flex flex-wrap gap-2">
                    {LEAD_DAY_OPTIONS.map(d => {
                      const on = notifications.leadDays.includes(d);
                      return (
                        <button key={d} onClick={() => toggleLeadDay(d)}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            on ? 'bg-accent text-white border-accent' : 'bg-ink/[0.05] text-ink/60 border-ink/[0.08]')}>
                          {t('settings.leadDayBefore', { count: d })}
                        </button>
                      );
                    })}
                  </div>
                )}
                <Row label={t('settings.reminderStartDay')} checked={notifications.periodStartDay} onChange={v => onSetNotifications({ periodStartDay: v })} />
              </ReminderGroup>

              <ReminderGroup label={t('settings.groupDuring')}>
                <Row label={t('settings.reminderStartConfirm')} checked={notifications.periodStartConfirm} onChange={v => onSetNotifications({ periodStartConfirm: v })} />
                <Row label={t('settings.reminderDaily')} checked={notifications.duringPeriod} onChange={v => onSetNotifications({ duringPeriod: v })} />
              </ReminderGroup>

              <ReminderGroup label={t('settings.groupAfter')}>
                <Row label={t('settings.reminderEndConfirm')} checked={notifications.periodEndConfirm} onChange={v => onSetNotifications({ periodEndConfirm: v })} />
              </ReminderGroup>

              {!hideFertility && (
                <ReminderGroup label={t('settings.groupFertility')}>
                  <Row label={t('settings.reminderOvulation')} checked={notifications.ovulation} onChange={v => onSetNotifications({ ovulation: v })} />
                  <Row label={t('settings.reminderFertile')} checked={notifications.fertileWindow} onChange={v => onSetNotifications({ fertileWindow: v })} />
                </ReminderGroup>
              )}

              <ReminderGroup label={t('settings.groupTips')}>
                <Row label={t('settings.reminderWellness')} checked={notifications.wellnessTips} onChange={v => onSetNotifications({ wellnessTips: v })} />
              </ReminderGroup>
            </div>
          )}
        </div>
      </div>

      {/* Data & backup */}
      <Group title={`${t('settings.sectionDataBackup')} · ${t('settings.cyclesShort', { count: cycles.length })}`}>
        <ActionRow icon={FileJson} label={t('settings.exportJsonTitle')} sub={t('settings.exportJsonBody')} onClick={onExportJSON} disabled={!hasData} />
        <ActionRow icon={FileSpreadsheet} label={t('settings.exportCsvTitle')} sub={t('settings.exportCsvBody')} onClick={onExportCSV} disabled={!hasData} />
        <ActionRow icon={FileJson} label={t('settings.importJsonTitle')} sub={t('settings.importJsonBody')} onClick={() => jsonInputRef.current?.click()} />
        <ActionRow icon={Upload} label={t('settings.importCsvTitle')} sub={t('settings.importCsvBody')} onClick={() => fileInputRef.current?.click()} />
        {shareSummary && <ActionRow icon={Share2} label={t('settings.shareSummaryTitle')} sub={t('settings.shareSummaryBody')} onClick={handleShare} />}
      </Group>
      {importMsg && <p className="text-sm text-follicular text-center -mt-3">{importMsg}</p>}

      {/* Legal */}
      <Group title={t('settings.sectionLegal')}>
        <ActionRow icon={Shield} label={t('settings.privacyPolicyTitle')} sub={t('settings.privacyPolicyBody')} href={import.meta.env.BASE_URL + 'privacy.html'} />
        <ActionRow icon={FileText} label={t('settings.termsTitle')} sub={t('settings.termsBody')} href={import.meta.env.BASE_URL + 'terms.html'} />
      </Group>

      {/* Danger zone */}
      <Group title={t('settings.sectionDanger')}>
        <ActionRow icon={Trash2} label={t('settings.clearAllTitle')} sub={t('settings.clearAllBody')} onClick={() => setClearConfirm(true)} disabled={!hasData} danger />
      </Group>

      {import.meta.env.DEV && (
        <button
          onClick={loadSampleData}
          className="w-full text-center text-xs text-ink/40 underline underline-offset-2 py-1"
        >
          {t('settings.loadSampleData')}
        </button>
      )}

      <p className="text-center text-xs text-ink/35 pt-2">cycle vault</p>

      {/* Hidden file inputs */}
      <input ref={jsonInputRef} type="file" accept=".json" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const count = await onImportJSON(file);
          setImportMsg(count > 0 ? t('settings.importedCyclesWithSymptoms', { count }) : t('settings.noNewCycles'));
          setTimeout(() => setImportMsg(null), 3000);
          if (jsonInputRef.current) jsonInputRef.current.value = '';
        }}
      />
      <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />

      <ConfirmDialog
        open={clearConfirm}
        title={t('settings.clearConfirmTitle')}
        message={t('settings.clearConfirmMessage')}
        confirmLabel={t('settings.clearConfirmButton')}
        onConfirm={() => { onClearAll(); setClearConfirm(false); }}
        onCancel={() => setClearConfirm(false)}
      />
    </motion.div>
  );
}
