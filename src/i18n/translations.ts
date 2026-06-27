/**
 * cycle vault — internationalization string catalog (en / tr / de)
 *
 * This is a CATALOG ONLY. Nothing is wired up to the app yet.
 *
 * Conventions
 * -----------
 * - Keys are stable, dot-free camelCase, grouped by area (nav, home, calendar,
 *   history, settings, sheet, symptoms, phases, insights, legal, common).
 * - Each leaf is `{ en, tr, de }`.
 * - Dynamic values use `{count}`, `{days}`, `{day}`, `{phase}`, `{date}`,
 *   `{pct}`, `{severity}`, `{label}`, `{current}`, `{usual}` placeholders.
 *   Placeholders are IDENTICAL across all three locales.
 * - The brand name "cycle vault" is intentionally left untranslated (lowercase)
 *   in every locale, per brand guidelines.
 *
 * Pluralization notes (IMPORTANT for the eventual i18n runtime)
 * ------------------------------------------------------------
 * English:  two forms — `one` (1) vs `other` (everything else).
 * German:   two forms — `one` (1) vs `other`. Same rule as English. The German
 *           strings below already use the correct form per key (singular keys
 *           use "Tag", plural keys use "Tage"/"Zyklen").
 * Turkish:  NO grammatical plural after a number — Turkish nouns stay singular
 *           when preceded by a numeral ("1 gün", "5 gün", never "5 günler").
 *           So for Turkish the `*One` and `*Other` variants are intentionally
 *           identical. They are kept as separate keys only so the en/de forms
 *           can differ; a runtime plural selector should still resolve them.
 *
 * Where the app currently builds a sentence by concatenation (e.g. the share
 * summary in App.tsx, or insights.ts templates), the catalog captures the FULL
 * template string with placeholders so the sentence can be translated as a
 * whole rather than glued together word-by-word. See the summary returned to
 * the caller for the list of concatenation sites that should be refactored.
 */

export type Locale = 'en' | 'tr' | 'de';

export interface TranslationEntry {
  en: string;
  tr: string;
  de: string;
}

export const translations = {
  // ---------------------------------------------------------------------------
  // Common / shared
  // ---------------------------------------------------------------------------
  common: {
    appName: { en: 'cycle vault', tr: 'cycle vault', de: 'cycle vault' },
    emDash: { en: '—', tr: '—', de: '—' },
    cancel: { en: 'Cancel', tr: 'İptal', de: 'Abbrechen' },
    confirm: { en: 'Confirm', tr: 'Onayla', de: 'Bestätigen' },
    delete: { en: 'Delete', tr: 'Sil', de: 'Löschen' },
    save: { en: 'Save', tr: 'Kaydet', de: 'Speichern' },
    saved: { en: 'Saved', tr: 'Kaydedildi', de: 'Gespeichert' },
    done: { en: 'Done', tr: 'Tamam', de: 'Fertig' },
    yes: { en: 'Yes', tr: 'Evet', de: 'Ja' },
    no: { en: 'No', tr: 'Hayır', de: 'Nein' },
    close: { en: 'Close', tr: 'Kapat', de: 'Schließen' },
    edit: { en: 'Edit', tr: 'Düzenle', de: 'Bearbeiten' },
  },

  // ---------------------------------------------------------------------------
  // Navigation (NavBar) — also used as aria-labels
  // ---------------------------------------------------------------------------
  nav: {
    home: { en: 'Home', tr: 'Ana Sayfa', de: 'Start' },
    calendar: { en: 'Calendar', tr: 'Takvim', de: 'Kalender' },
    history: { en: 'History', tr: 'Geçmiş', de: 'Verlauf' },
    settings: { en: 'Settings', tr: 'Ayarlar', de: 'Einstellungen' },
    logPeriod: { en: 'Log a period', tr: 'Regl kaydı ekle', de: 'Periode erfassen' },
  },

  // ---------------------------------------------------------------------------
  // Home view (HomeView, CycleRing, StatCard, ActivePeriodBanner)
  // ---------------------------------------------------------------------------
  home: {
    // CycleRing center: "Day {day}"
    ringDay: { en: 'Day {day}', tr: '{day}. gün', de: 'Tag {day}' },
    // CycleRing subtitle: "{phase} Phase"
    ringPhase: { en: '{phase} Phase', tr: '{phase} fazı', de: '{phase}' },

    // StatCard labels
    nextPeriod: { en: 'Next Period', tr: 'Sonraki Regl', de: 'Nächste Periode' },
    cycleDay: { en: 'Cycle Day', tr: 'Döngü Günü', de: 'Zyklustag' },

    // StatCard value: next-period countdown. Plural-sensitive.
    nextPeriodDayOne: { en: '{count} Day', tr: '{count} gün', de: '{count} Tag' },
    nextPeriodDayOther: { en: '{count} Days', tr: '{count} gün', de: '{count} Tage' },

    // StatCard value: current cycle day
    cycleDayValue: { en: 'Day {day}', tr: '{day}. gün', de: 'Tag {day}' },

    // PhaseCard subtitle (default when no period-day subtitle)
    currentPhase: { en: 'Your current phase', tr: 'Şu anki fazın', de: 'Deine aktuelle Phase' },
    // PhaseCard subtitle when in period: "Day {day} of your period"
    periodDay: { en: 'Day {day} of your period', tr: 'Reglinin {day}. günü', de: 'Tag {day} deiner Periode' },

    // Empty state (no cycles yet)
    emptyLogFirst: {
      en: 'Log your first period with the + button below',
      tr: 'Aşağıdaki + düğmesiyle ilk reglini kaydet',
      de: 'Erfasse deine erste Periode mit dem +-Button unten',
    },

    // ActivePeriodBanner: "Period ongoing — Day {count}"
    bannerOngoing: {
      en: 'Period ongoing — Day {count}',
      tr: 'Regl devam ediyor — {count}. gün',
      de: 'Periode läuft — Tag {count}',
    },
    bannerStarted: { en: 'Started {date}', tr: '{date} tarihinde başladı', de: 'Begonnen am {date}' },
    bannerEnd: { en: 'End', tr: 'Bitir', de: 'Beenden' },

    // Empty dashboard prompt (when no cycles logged)
    headToCalendar: {
      en: 'Head to the Calendar to log your first period.',
      tr: 'İlk reglini kaydetmek için Takvim’e git.',
      de: 'Geh zum Kalender, um deine erste Periode zu erfassen.',
    },

    // Estimated upcoming cycles (dashboard) + data-driven notes
    upcomingTitle: { en: 'Estimated upcoming cycles', tr: 'Tahmini sonraki döngüler', de: 'Voraussichtliche Zyklen' },
    estimateNote: {
      en: 'Approximate — for planning, not medical use.',
      tr: 'Yaklaşık — planlama içindir, tıbbi kullanım için değildir.',
      de: 'Ungefähr — zur Planung, nicht für medizinische Zwecke.',
    },
    dataNote: {
      en: 'The more cycles you log, the sharper these estimates get.',
      tr: 'Ne kadar çok döngü kaydedersen tahminler o kadar netleşir.',
      de: 'Je mehr Zyklen du erfasst, desto genauer werden diese Schätzungen.',
    },
  },

  // ---------------------------------------------------------------------------
  // Cycle history panel (CycleHistoryPanel)
  // ---------------------------------------------------------------------------
  historyStats: {
    title: { en: 'Your cycle history', tr: 'Döngü geçmişin', de: 'Dein Zyklusverlauf' },
    avgCycle: { en: 'Avg cycle', tr: 'Ort. döngü', de: 'Ø Zyklus' },
    avgPeriod: { en: 'Avg period', tr: 'Ort. regl', de: 'Ø Periode' },
    range: { en: 'Range', tr: 'Aralık', de: 'Spanne' },
    recent: { en: 'Recent', tr: 'Son kayıtlar', de: 'Zuletzt' },
    regular: { en: 'regular', tr: 'düzenli', de: 'regelmäßig' },
    mostlyRegular: { en: 'mostly regular', tr: 'çoğunlukla düzenli', de: 'meist regelmäßig' },
    irregular: { en: 'irregular', tr: 'düzensiz', de: 'unregelmäßig' },
    dayCycle: { en: '{count}-day cycle', tr: '{count} günlük döngü', de: '{count}-Tage-Zyklus' },
    // Latest (ongoing) cycle — show how far into it we are, not a vague "current".
    currentDay: { en: 'day {count}', tr: '{count}. gün', de: 'Tag {count}' },
    cyclesTrackedOne: { en: '{count} cycle tracked', tr: '{count} döngü takip edildi', de: '{count} Zyklus erfasst' },
    cyclesTrackedOther: { en: '{count} cycles tracked', tr: '{count} döngü takip edildi', de: '{count} Zyklen erfasst' },
  },

  // ---------------------------------------------------------------------------
  // Calendar view (CalendarView, CalendarGrid)
  // ---------------------------------------------------------------------------
  calendar: {
    title: { en: 'Calendar', tr: 'Takvim', de: 'Kalender' },

    // Legend
    legendPeriod: { en: 'Period', tr: 'Regl', de: 'Periode' },
    legendFertile: { en: 'Fertile', tr: 'Doğurgan', de: 'Fruchtbar' },
    legendOvulation: { en: 'Ovulation', tr: 'Yumurtlama', de: 'Eisprung' },
    legendLuteal: { en: 'Luteal', tr: 'Luteal faz', de: 'Lutealphase' },
    legendLogged: { en: 'Logged', tr: 'Kayıtlı', de: 'Erfasst' },

    // Upcoming section
    upcoming: { en: 'Upcoming', tr: 'Yaklaşan', de: 'Bevorstehend' },
    nextPeriod: { en: 'Next Period', tr: 'Sonraki Regl', de: 'Nächste Periode' },
    // "In {count} day" / "In {count} days"
    inDaysOne: { en: 'In {count} day', tr: '{count} gün içinde', de: 'In {count} Tag' },
    inDaysOther: { en: 'In {count} days', tr: '{count} gün içinde', de: 'In {count} Tagen' },

    // CalendarGrid weekday headers (2-letter abbreviations, Sun–Sat order).
    // Two letters because tr/de single letters collide (e.g. tr Pazar/Pazartesi
    // both "P"; de Sonntag/Samstag both "S").
    weekdaySun: { en: 'Su', tr: 'Pz', de: 'So' },
    weekdayMon: { en: 'Mo', tr: 'Pt', de: 'Mo' },
    weekdayTue: { en: 'Tu', tr: 'Sa', de: 'Di' },
    weekdayWed: { en: 'We', tr: 'Ça', de: 'Mi' },
    weekdayThu: { en: 'Th', tr: 'Pe', de: 'Do' },
    weekdayFri: { en: 'Fr', tr: 'Cu', de: 'Fr' },
    weekdaySat: { en: 'Sa', tr: 'Ct', de: 'Sa' },

    // Month navigation aria-labels
    prevMonth: { en: 'Previous month', tr: 'Önceki ay', de: 'Voriger Monat' },
    nextMonth: { en: 'Next month', tr: 'Sonraki ay', de: 'Nächster Monat' },

    // Countdown banner (CalendarView)
    periodOverdueOne: { en: 'Period overdue by {count} day', tr: 'Regl {count} gün gecikti', de: 'Periode {count} Tag überfällig' },
    periodOverdueOther: { en: 'Period overdue by {count} days', tr: 'Regl {count} gün gecikti', de: 'Periode {count} Tage überfällig' },
    periodExpectedToday: { en: 'Period expected today', tr: 'Regl bugün bekleniyor', de: 'Periode heute erwartet' },
    nextPeriodInOne: { en: 'Next period in {count} day', tr: 'Sonraki regl {count} gün içinde', de: 'Nächste Periode in {count} Tag' },
    nextPeriodInOther: { en: 'Next period in {count} days', tr: 'Sonraki regl {count} gün içinde', de: 'Nächste Periode in {count} Tagen' },
    around: { en: 'Around {date}', tr: 'Yaklaşık {date}', de: 'Etwa am {date}' },

    // End-date selection banner
    pickEndDate: { en: 'Pick the end date', tr: 'Bitiş tarihini seç', de: 'Enddatum wählen' },
    periodStartingTap: {
      en: 'Period starting {date} — tap the last day, or:',
      tr: 'Regl {date} tarihinde başlıyor — son güne dokun ya da:',
      de: 'Periode beginnt am {date} — tippe den letzten Tag an, oder:',
    },
    stillOngoing: { en: 'Still ongoing', tr: 'Hâlâ devam ediyor', de: 'Läuft noch' },
  },

  // ---------------------------------------------------------------------------
  // History view (HistoryView)
  // ---------------------------------------------------------------------------
  history: {
    title: { en: 'History', tr: 'Geçmiş', de: 'Verlauf' },

    emptyTitle: { en: 'No cycles logged yet', tr: 'Henüz döngü kaydı yok', de: 'Noch keine Zyklen erfasst' },
    emptySubtitle: {
      en: 'Use the + button to log your first period',
      tr: 'İlk reglini kaydetmek için + düğmesini kullan',
      de: 'Nutze den +-Button, um deine erste Periode zu erfassen',
    },

    ongoing: { en: 'Ongoing', tr: 'Devam ediyor', de: 'Laufend' },
    started: { en: 'Started {date}', tr: '{date} tarihinde başladı', de: 'Begonnen am {date}' },
    // Duration suffix appended after start date, e.g. "Started May 3 · 5 days"
    durationOne: { en: '{count} day', tr: '{count} gün', de: '{count} Tag' },
    durationOther: { en: '{count} days', tr: '{count} gün', de: '{count} Tage' },

    // Delete confirmation dialog
    deleteTitle: { en: 'Delete Cycle', tr: 'Döngüyü Sil', de: 'Zyklus löschen' },
    deleteMessage: {
      en: 'This will permanently remove this cycle from your history.',
      tr: 'Bu döngü geçmişinden kalıcı olarak kaldırılacak.',
      de: 'Dieser Zyklus wird dauerhaft aus deinem Verlauf entfernt.',
    },
    deleteConfirm: { en: 'Delete', tr: 'Sil', de: 'Löschen' },
  },

  // ---------------------------------------------------------------------------
  // Settings view (SettingsView)
  // ---------------------------------------------------------------------------
  settings: {
    title: { en: 'Settings', tr: 'Ayarlar', de: 'Einstellungen' },

    // Preferences group + language selector
    sectionPreferences: { en: 'Preferences', tr: 'Tercihler', de: 'Einstellungen' },
    language: { en: 'Language', tr: 'Dil', de: 'Sprache' },

    // Slim privacy banner (shorter than privacyBody below)
    privacyBannerShort: {
      en: 'Everything stays on your device. No accounts, no cloud, no tracking.',
      tr: 'Her şey cihazında kalır. Hesap yok, bulut yok, izleme yok.',
      de: 'Alles bleibt auf deinem Gerät. Keine Konten, keine Cloud, kein Tracking.',
    },
    hideFertilityShort: {
      en: 'Show only your period on the calendar.',
      tr: 'Takvimde yalnızca regli göster.',
      de: 'Nur deine Periode im Kalender anzeigen.',
    },

    // Reminders group
    sectionReminders: { en: 'Reminders', tr: 'Hatırlatıcılar', de: 'Erinnerungen' },
    notifications: { en: 'Notifications', tr: 'Bildirimler', de: 'Benachrichtigungen' },
    notifOnDevice: {
      en: 'On-device only. Nothing leaves your phone.',
      tr: 'Yalnızca cihazda. Telefonundan hiçbir şey çıkmaz.',
      de: 'Nur auf dem Gerät. Nichts verlässt dein Telefon.',
    },
    notifPermissionHint: {
      en: 'Reminders need the installed app with notifications allowed (iOS Settings → cycle vault → Notifications).',
      tr: 'Hatırlatıcılar için yüklü uygulama ve izin verilmiş bildirimler gerekir (iOS Ayarlar → cycle vault → Bildirimler).',
      de: 'Erinnerungen brauchen die installierte App mit erlaubten Benachrichtigungen (iOS-Einstellungen → cycle vault → Mitteilungen).',
    },
    reminderTime: { en: 'Reminder time', tr: 'Hatırlatma saati', de: 'Erinnerungszeit' },
    enableNotifAria: { en: 'Enable notifications', tr: 'Bildirimleri etkinleştir', de: 'Benachrichtigungen aktivieren' },
    groupBefore: { en: 'Before your period', tr: 'Reglinden önce', de: 'Vor deiner Periode' },
    groupDuring: { en: 'During your period', tr: 'Reglin sırasında', de: 'Während deiner Periode' },
    groupAfter: { en: 'After your period', tr: 'Reglinden sonra', de: 'Nach deiner Periode' },
    groupFertility: { en: 'Fertility', tr: 'Doğurganlık', de: 'Fruchtbarkeit' },
    groupTips: { en: 'Tips', tr: 'İpuçları', de: 'Tipps' },
    reminderUpcoming: { en: 'Upcoming period', tr: 'Yaklaşan regl', de: 'Bevorstehende Periode' },
    leadDayBefore: { en: '{count}d before', tr: '{count}g önce', de: '{count}T vorher' },
    reminderStartDay: { en: 'Period start day', tr: 'Regl başlangıç günü', de: 'Periodenbeginn' },
    reminderStartConfirm: { en: 'Did your period start?', tr: 'Reglin başladı mı?', de: 'Hat deine Periode begonnen?' },
    reminderDaily: { en: 'Daily symptom reminder', tr: 'Günlük belirti hatırlatıcısı', de: 'Tägliche Symptom-Erinnerung' },
    reminderEndConfirm: { en: 'Did it end? (log it)', tr: 'Bitti mi? (kaydet)', de: 'Vorbei? (erfassen)' },
    reminderOvulation: { en: 'Ovulation day', tr: 'Yumurtlama günü', de: 'Eisprungtag' },
    reminderFertile: { en: 'Fertile window start', tr: 'Doğurgan dönem başlangıcı', de: 'Beginn der fruchtbaren Tage' },
    reminderWellness: { en: 'Phase wellness tips', tr: 'Faz sağlık ipuçları', de: 'Phasen-Wellness-Tipps' },

    // Data & backup group
    sectionDataBackup: { en: 'Data & backup', tr: 'Veri ve yedek', de: 'Daten & Sicherung' },
    cyclesShortOne: { en: '{count} cycle', tr: '{count} döngü', de: '{count} Zyklus' },
    cyclesShortOther: { en: '{count} cycles', tr: '{count} döngü', de: '{count} Zyklen' },

    loadSampleData: { en: 'Load sample data (dev)', tr: 'Örnek veri yükle (geliştirme)', de: 'Beispieldaten laden (Dev)' },

    // Privacy banner
    privacyTitle: { en: 'Your data is private', tr: 'Verilerin gizli', de: 'Deine Daten sind privat' },
    privacyBody: {
      en: 'Everything stays on your device. No accounts, no cloud, no tracking. We never see your data.',
      tr: 'Her şey cihazında kalır. Hesap yok, bulut yok, izleme yok. Verilerini asla görmeyiz.',
      de: 'Alles bleibt auf deinem Gerät. Keine Konten, keine Cloud, kein Tracking. Wir sehen deine Daten nie.',
    },

    // Cycle section
    sectionCycle: { en: 'Cycle', tr: 'Döngü', de: 'Zyklus' },
    avgCycleLength: { en: 'Average cycle length', tr: 'Ortalama döngü uzunluğu', de: 'Durchschnittliche Zykluslänge' },
    // "Computed from your data: {count} days"
    computedFromData: {
      en: 'Computed from your data: {count} days',
      tr: 'Verilerinden hesaplandı: {count} gün',
      de: 'Aus deinen Daten berechnet: {count} Tage',
    },
    usedUntilEnough: {
      en: 'Used until enough cycles are logged',
      tr: 'Yeterli döngü kaydedilene kadar kullanılır',
      de: 'Wird verwendet, bis genügend Zyklen erfasst sind',
    },
    daysUnit: { en: 'days', tr: 'gün', de: 'Tage' },
    resetToDefault: { en: 'Reset to default (28)', tr: 'Varsayılana sıfırla (28)', de: 'Auf Standard zurücksetzen (28)' },

    // Tracking section
    sectionTracking: { en: 'Tracking', tr: 'Takip', de: 'Tracking' },
    hideFertilityTitle: {
      en: 'Hide cycle indicators',
      tr: 'Döngü göstergelerini gizle',
      de: 'Zyklus-Anzeigen ausblenden',
    },
    hideFertilityBody: {
      en: "For when you're not trying to conceive — removes fertile-window and ovulation predictions everywhere.",
      tr: 'Hamile kalmaya çalışmadığın zamanlar için — doğurgan dönem ve yumurtlama tahminlerini her yerden kaldırır.',
      de: 'Für Zeiten, in denen du nicht schwanger werden möchtest — entfernt überall die Vorhersagen zu fruchtbaren Tagen und Eisprung.',
    },
    hideFertilityAria: {
      en: 'Hide cycle indicators',
      tr: 'Döngü göstergelerini gizle',
      de: 'Zyklus-Anzeigen ausblenden',
    },

    // Data info
    sectionData: { en: 'Data', tr: 'Veri', de: 'Daten' },
    cyclesLoggedOne: { en: '{count} cycle logged', tr: '{count} döngü kaydedildi', de: '{count} Zyklus erfasst' },
    cyclesLoggedOther: { en: '{count} cycles logged', tr: '{count} döngü kaydedildi', de: '{count} Zyklen erfasst' },
    storedLocally: {
      en: 'All data stored locally on this device',
      tr: 'Tüm veriler bu cihazda yerel olarak saklanır',
      de: 'Alle Daten werden lokal auf diesem Gerät gespeichert',
    },

    // Export section
    sectionExport: { en: 'Export', tr: 'Dışa Aktar', de: 'Exportieren' },
    exportJsonTitle: { en: 'Export as JSON', tr: 'JSON olarak dışa aktar', de: 'Als JSON exportieren' },
    exportJsonBody: {
      en: 'Full backup — includes symptoms, notes & history',
      tr: 'Tam yedek — belirtileri, notları ve geçmişi içerir',
      de: 'Vollständige Sicherung — inklusive Symptome, Notizen & Verlauf',
    },
    exportCsvTitle: { en: 'Export as CSV', tr: 'CSV olarak dışa aktar', de: 'Als CSV exportieren' },
    exportCsvBody: {
      en: 'Symptoms, notes & cycle dates — opens in Excel',
      tr: 'Belirtiler, notlar ve döngü tarihleri — Excel ile açılır',
      de: 'Symptome, Notizen & Zyklusdaten — öffnet sich in Excel',
    },

    // Import section
    sectionImport: { en: 'Import', tr: 'İçe Aktar', de: 'Importieren' },
    importJsonTitle: { en: 'Import JSON', tr: "JSON'u içe aktar", de: 'JSON importieren' },
    importJsonBody: { en: 'Restore from a backup file', tr: 'Bir yedek dosyasından geri yükle', de: 'Aus einer Sicherungsdatei wiederherstellen' },
    importCsvTitle: { en: 'Import CSV', tr: "CSV'yi içe aktar", de: 'CSV importieren' },
    importCsvBody: { en: 'Add cycles from a CSV file', tr: 'Bir CSV dosyasından döngü ekle', de: 'Zyklen aus einer CSV-Datei hinzufügen' },

    // Import result toasts
    importedCyclesOne: { en: 'Imported {count} cycle', tr: '{count} döngü içe aktarıldı', de: '{count} Zyklus importiert' },
    importedCyclesOther: { en: 'Imported {count} cycles', tr: '{count} döngü içe aktarıldı', de: '{count} Zyklen importiert' },
    importedCyclesWithSymptomsOne: {
      en: 'Imported {count} cycle with symptoms',
      tr: '{count} döngü belirtileriyle içe aktarıldı',
      de: '{count} Zyklus mit Symptomen importiert',
    },
    importedCyclesWithSymptomsOther: {
      en: 'Imported {count} cycles with symptoms',
      tr: '{count} döngü belirtileriyle içe aktarıldı',
      de: '{count} Zyklen mit Symptomen importiert',
    },
    noNewCycles: { en: 'No new cycles found', tr: 'Yeni döngü bulunamadı', de: 'Keine neuen Zyklen gefunden' },

    // Share section
    sectionShare: { en: 'Share', tr: 'Paylaş', de: 'Teilen' },
    shareSummaryTitle: { en: 'Share Summary', tr: 'Özeti Paylaş', de: 'Zusammenfassung teilen' },
    shareSummaryBody: { en: 'Share current cycle status', tr: 'Güncel döngü durumunu paylaş', de: 'Aktuellen Zyklusstatus teilen' },
    summaryCopied: { en: 'Summary copied to clipboard', tr: 'Özet panoya kopyalandı', de: 'Zusammenfassung in die Zwischenablage kopiert' },

    // Danger zone
    sectionDanger: { en: 'Danger Zone', tr: 'Tehlikeli Bölge', de: 'Gefahrenzone' },
    clearAllTitle: { en: 'Clear All Data', tr: 'Tüm Verileri Sil', de: 'Alle Daten löschen' },
    clearAllBody: { en: 'Permanently delete all cycles', tr: 'Tüm döngüleri kalıcı olarak sil', de: 'Alle Zyklen dauerhaft löschen' },
    clearConfirmTitle: { en: 'Clear All Data', tr: 'Tüm Verileri Sil', de: 'Alle Daten löschen' },
    clearConfirmMessage: {
      en: 'This will permanently delete all your cycle data. This cannot be undone.',
      tr: 'Bu, tüm döngü verilerini kalıcı olarak siler. Geri alınamaz.',
      de: 'Dadurch werden alle deine Zyklusdaten dauerhaft gelöscht. Dies kann nicht rückgängig gemacht werden.',
    },
    clearConfirmButton: { en: 'Delete Everything', tr: 'Her Şeyi Sil', de: 'Alles löschen' },

    // Privacy & Legal section
    sectionLegal: { en: 'Privacy & Legal', tr: 'Gizlilik ve Yasal', de: 'Datenschutz & Rechtliches' },
    privacyPolicyTitle: { en: 'Privacy Policy', tr: 'Gizlilik Politikası', de: 'Datenschutzerklärung' },
    privacyPolicyBody: {
      en: 'How your data is handled (it never leaves your device)',
      tr: 'Verilerinin nasıl işlendiği (cihazından asla çıkmaz)',
      de: 'Wie deine Daten behandelt werden (sie verlassen dein Gerät nie)',
    },
    termsTitle: { en: 'Terms & Medical Disclaimer', tr: 'Şartlar ve Tıbbi Sorumluluk Reddi', de: 'AGB & medizinischer Haftungsausschluss' },
    termsBody: {
      en: 'Not medical advice; not for contraception',
      tr: 'Tıbbi tavsiye değildir; doğum kontrolü için değildir',
      de: 'Keine medizinische Beratung; nicht zur Verhütung',
    },
  },

  // ---------------------------------------------------------------------------
  // Log/Edit period bottom sheet (LogPeriodSheet)
  // ---------------------------------------------------------------------------
  sheet: {
    // Titles per mode
    titleStart: { en: 'Start Cycle', tr: 'Döngü Başlat', de: 'Zyklus starten' },
    titleEnd: { en: 'End Cycle', tr: 'Döngüyü Bitir', de: 'Zyklus beenden' },
    titleLog: { en: 'Log Period', tr: 'Regl Kaydet', de: 'Periode erfassen' },
    titleEdit: { en: 'Edit Period', tr: 'Regli Düzenle', de: 'Periode bearbeiten' },

    // Save button labels per mode
    saveStart: { en: 'Start Cycle', tr: 'Döngü Başlat', de: 'Zyklus starten' },
    saveEnd: { en: 'End Cycle', tr: 'Döngüyü Bitir', de: 'Zyklus beenden' },
    saveLog: { en: 'Log Period', tr: 'Regl Kaydet', de: 'Periode erfassen' },
    saveEdit: { en: 'Update Period', tr: 'Regli Güncelle', de: 'Periode aktualisieren' },

    // Mode tabs
    tabStart: { en: 'Start Cycle', tr: 'Döngü Başlat', de: 'Zyklus starten' },
    tabEnd: { en: 'End Cycle', tr: 'Döngüyü Bitir', de: 'Zyklus beenden' },
    tabLog: { en: 'Log Period', tr: 'Regl Kaydet', de: 'Periode erfassen' },

    // Selection labels (uppercase in UI; keep natural casing here)
    labelStart: { en: 'Start', tr: 'Başlangıç', de: 'Beginn' },
    labelStarted: { en: 'Started', tr: 'Başladı', de: 'Begonnen' },
    labelEnd: { en: 'End', tr: 'Bitiş', de: 'Ende' },

    // DayDetailSheet period actions
    startPeriodHere: { en: 'Start a period here', tr: 'Burada regl başlat', de: 'Hier eine Periode starten' },
    endPeriodOnDay: { en: 'End period on this day', tr: 'Reglini bu gün bitir', de: 'Periode an diesem Tag beenden' },
  },

  // ---------------------------------------------------------------------------
  // Symptom logging (SymptomPills, DayDetailSheet)
  // ---------------------------------------------------------------------------
  symptoms: {
    // Prompt
    howFeeling: { en: 'How are you feeling today?', tr: 'Bugün nasıl hissediyorsun?', de: 'Wie fühlst du dich heute?' },

    // Category pills / section headers
    mood: { en: 'Mood', tr: 'Ruh hali', de: 'Stimmung' },
    energy: { en: 'Energy', tr: 'Enerji', de: 'Energie' },
    cramps: { en: 'Cramps', tr: 'Kramplar', de: 'Krämpfe' },
    flow: { en: 'Flow', tr: 'Kanama', de: 'Blutung' },
    pain: { en: 'Pain', tr: 'Ağrı', de: 'Schmerzen' },
    sleep: { en: 'Sleep', tr: 'Uyku', de: 'Schlaf' },

    // Mood options
    moodAnxious: { en: 'Anxious', tr: 'Endişeli', de: 'Ängstlich' },
    moodSad: { en: 'Sad', tr: 'Üzgün', de: 'Traurig' },
    moodIrritable: { en: 'Irritable', tr: 'Sinirli', de: 'Gereizt' },
    moodEnergetic: { en: 'Energetic', tr: 'Enerjik', de: 'Energiegeladen' },
    moodCalm: { en: 'Calm', tr: 'Sakin', de: 'Ruhig' },
    moodHappy: { en: 'Happy', tr: 'Mutlu', de: 'Glücklich' },

    // Flow levels
    flowSpotting: { en: 'Spotting', tr: 'Lekelenme', de: 'Schmierblutung' },
    flowLight: { en: 'Light', tr: 'Hafif', de: 'Leicht' },
    flowMedium: { en: 'Medium', tr: 'Orta', de: 'Mittel' },
    flowHeavy: { en: 'Heavy', tr: 'Yoğun', de: 'Stark' },

    // Energy levels (Low / Moderate / High)
    energyLow: { en: 'Low', tr: 'Düşük', de: 'Niedrig' },
    energyModerate: { en: 'Moderate', tr: 'Orta', de: 'Mittel' },
    energyHigh: { en: 'High', tr: 'Yüksek', de: 'Hoch' },

    // Cramps / pain severity (Mild / Moderate / Severe)
    severityMild: { en: 'Mild', tr: 'Hafif', de: 'Leicht' },
    severityModerate: { en: 'Moderate', tr: 'Orta', de: 'Mittel' },
    severitySevere: { en: 'Severe', tr: 'Şiddetli', de: 'Stark' },

    // Generic severity read-out in DayDetailSheet (Low / Medium / High)
    detailLow: { en: 'Low', tr: 'Düşük', de: 'Niedrig' },
    detailMedium: { en: 'Medium', tr: 'Orta', de: 'Mittel' },
    detailHigh: { en: 'High', tr: 'Yüksek', de: 'Hoch' },

    // Sleep quality (Poor / Fair / Good)
    sleepPoor: { en: 'Poor', tr: 'Kötü', de: 'Schlecht' },
    sleepFair: { en: 'Fair', tr: 'Orta', de: 'Mittel' },
    sleepGood: { en: 'Good', tr: 'İyi', de: 'Gut' },

    // Pain locations
    locationLabel: { en: 'Location', tr: 'Bölge', de: 'Bereich' },
    severityLabel: { en: 'Severity', tr: 'Şiddet', de: 'Stärke' },
    painHead: { en: 'Head', tr: 'Baş', de: 'Kopf' },
    painBreast: { en: 'Breast', tr: 'Göğüs', de: 'Brust' },
    painBack: { en: 'Back', tr: 'Sırt', de: 'Rücken' },
    painJoints: { en: 'Joints', tr: 'Eklemler', de: 'Gelenke' },

    // Functional impact
    impactQuestion: {
      en: 'Symptoms affected your day?',
      tr: 'Belirtiler gününü etkiledi mi?',
      de: 'Haben die Symptome deinen Tag beeinträchtigt?',
    },
    impactAffected: {
      en: 'Affected daily activities',
      tr: 'Günlük aktiviteleri etkiledi',
      de: 'Hat den Alltag beeinträchtigt',
    },

    // Notes
    addNote: { en: 'Add note...', tr: 'Not ekle...', de: 'Notiz hinzufügen...' },
    addMore: { en: 'Add more...', tr: 'Daha fazla ekle...', de: 'Mehr hinzufügen...' },
    notePlaceholder: { en: 'Add to your notes...', tr: 'Notlarına ekle...', de: 'Zu deinen Notizen hinzufügen...' },
    deleteNote: { en: 'Delete note', tr: 'Notu sil', de: 'Notiz löschen' },

    // DayDetailSheet
    noSymptomsForDay: {
      en: 'No symptoms logged for this day',
      tr: 'Bu gün için belirti kaydı yok',
      de: 'Für diesen Tag wurden keine Symptome erfasst',
    },
    editSymptoms: { en: 'Edit Symptoms', tr: 'Belirtileri Düzenle', de: 'Symptome bearbeiten' },
    logSymptoms: { en: 'Log Symptoms', tr: 'Belirti Kaydet', de: 'Symptome erfassen' },
  },

  // ---------------------------------------------------------------------------
  // Phases (PHASES constant in types.ts + UI phase names)
  // ---------------------------------------------------------------------------
  phases: {
    // Phase display names (used in CycleRing "{phase} Phase", PhaseCard, etc.)
    menstrual: { en: 'Menstrual', tr: 'Menstrüel', de: 'Menstruationsphase' },
    follicular: { en: 'Follicular', tr: 'Foliküler', de: 'Follikelphase' },
    ovulation: { en: 'Ovulation', tr: 'Yumurtlama', de: 'Ovulationsphase' },
    luteal: { en: 'Luteal', tr: 'Luteal', de: 'Lutealphase' },

    // Phase descriptions
    menstrualDesc: {
      en: 'Your body is shedding the uterine lining. Focus on rest and gentle movement.',
      tr: 'Vücudun rahim iç zarını atıyor. Dinlenmeye ve hafif harekete odaklan.',
      de: 'Dein Körper stößt die Gebärmutterschleimhaut ab. Konzentriere dich auf Ruhe und sanfte Bewegung.',
    },
    follicularDesc: {
      en: 'Estrogen levels are rising. You might feel more energetic and creative.',
      tr: 'Östrojen seviyeleri yükseliyor. Kendini daha enerjik ve yaratıcı hissedebilirsin.',
      de: 'Der Östrogenspiegel steigt. Du fühlst dich vielleicht energiegeladener und kreativer.',
    },
    ovulationDesc: {
      en: 'Estimated fertile window. Calendar-based estimates are approximate — not for medical use.',
      tr: 'Tahmini doğurgan dönem. Takvim temelli tahminler yaklaşıktır — tıbbi kullanım için değildir.',
      de: 'Geschätzte fruchtbare Tage. Kalenderbasierte Schätzungen sind ungefähr — nicht für medizinische Zwecke geeignet.',
    },
    lutealDesc: {
      en: 'Progesterone rises. Focus on grounding activities and self-care.',
      tr: 'Progesteron yükselir. Seni dengeleyen aktivitelere ve kişisel bakıma odaklan.',
      de: 'Der Progesteronspiegel steigt. Konzentriere dich auf erdende Aktivitäten und Selbstfürsorge.',
    },
  },

  // ---------------------------------------------------------------------------
  // Insights (insights.ts — panels, phase tips, templated descriptions)
  // ---------------------------------------------------------------------------
  insights: {
    // Section headers
    today: { en: 'Today', tr: 'Bugün', de: 'Heute' },
    yourPatterns: { en: 'Your Patterns', tr: 'Düzenlerin', de: 'Deine Muster' },

    // Empty / not-enough-data states (InsightsPanel)
    needMoreCycles: {
      en: 'Log 2+ cycles to see personalized insights',
      tr: 'Kişiye özel içgörüler için 2+ döngü kaydet',
      de: 'Erfasse 2+ Zyklen, um persönliche Einblicke zu sehen',
    },
    logRegularly: {
      en: 'Log symptoms regularly to build up your patterns',
      tr: 'Düzenlerini oluşturmak için belirtileri düzenli kaydet',
      de: 'Erfasse Symptome regelmäßig, um deine Muster aufzubauen',
    },

    // Symptom labels used inside insight templates (lowercase, mid-sentence).
    // These are the human-readable forms of SYMPTOM_LABELS in insights.ts.
    symptomLabelCramps: { en: 'cramps', tr: 'kramplar', de: 'Krämpfe' },
    symptomLabelEnergy: { en: 'energy changes', tr: 'enerji değişimleri', de: 'Energieschwankungen' },
    symptomLabelMood: { en: 'mood shifts', tr: 'ruh hali değişimleri', de: 'Stimmungsschwankungen' },
    symptomLabelPain: { en: 'pain', tr: 'ağrı', de: 'Schmerzen' },
    symptomLabelFlow: { en: 'flow changes', tr: 'kanama değişimleri', de: 'Veränderungen der Blutung' },
    symptomLabelSleep: { en: 'sleep changes', tr: 'uyku değişimleri', de: 'Schlafveränderungen' },

    // Severity words used inside insight templates (lowercase, mid-sentence).
    // SEVERITY_WORDS in insights.ts: 1=mild, 2=moderate, 3=strong.
    severityWordMild: { en: 'mild', tr: 'hafif', de: 'leicht' },
    severityWordModerate: { en: 'moderate', tr: 'orta', de: 'mittel' },
    severityWordStrong: { en: 'strong', tr: 'şiddetli', de: 'stark' },

    // --- Pattern insight (generateInsights) ---
    // Title: "{label} in {phase}" — label is capitalized symptom label.
    patternTitle: { en: '{label} in {phase}', tr: '{phase} fazında {label}', de: '{label} in der {phase}' },
    // Description without severity:
    // "You experience {label} in {pct}% of your {phase} days."
    patternDesc: {
      en: 'You experience {label} in {pct}% of your {phase} days.',
      tr: '{phase} günlerinin %{pct} kadarında {label} yaşıyorsun.',
      de: 'Du erlebst {label} an {pct}% deiner Tage in der {phase}.',
    },
    // Description with severity:
    // "You experience {label} (avg {severity}) in {pct}% of your {phase} days."
    patternDescSeverity: {
      en: 'You experience {label} (avg {severity}) in {pct}% of your {phase} days.',
      tr: '{phase} günlerinin %{pct} kadarında {label} (ort. {severity}) yaşıyorsun.',
      de: 'Du erlebst {label} (durchschnittlich {severity}) an {pct}% deiner Tage in der {phase}.',
    },

    // --- Cycle-length insight (getCycleLengthAlert) ---
    periodLate: { en: 'Period arrived late', tr: 'Regl geç geldi', de: 'Periode kam spät' },
    periodEarly: { en: 'Period arrived early', tr: 'Regl erken geldi', de: 'Periode kam früh' },
    // Alert message. {direction} is one of cycleDirectionLate/Early below.
    // "Your last period arrived {days} days {direction} (cycle was {current} days vs your usual {usual})."
    cycleLengthMessage: {
      en: 'Your last period arrived {days} days {direction} (cycle was {current} days vs your usual {usual}).',
      tr: 'Son reglin {days} gün {direction} geldi (döngü {current} gün sürdü; normalde {usual} gündü).',
      de: 'Deine letzte Periode kam {days} Tage {direction} (der Zyklus dauerte {current} Tage statt der üblichen {usual} Tage).',
    },
    cycleDirectionLate: { en: 'late', tr: 'geç', de: 'zu spät' },
    cycleDirectionEarly: { en: 'early', tr: 'erken', de: 'zu früh' },

    // --- Phase tips (PHASE_TIPS) — always shown ---
    tipMenstrualTitle: { en: 'Rest is productive', tr: 'Dinlenmek de üretkenliktir', de: 'Ruhe ist produktiv' },
    tipMenstrualDesc: {
      en: 'Your body is doing significant work right now. Prioritize sleep, warmth, and gentle movement.',
      tr: 'Vücudun şu anda önemli bir iş yapıyor. Uykuya, sıcaklığa ve hafif harekete öncelik ver.',
      de: 'Dein Körper leistet gerade bedeutende Arbeit. Priorisiere Schlaf, Wärme und sanfte Bewegung.',
    },
    tipFollicularTitle: { en: 'Energy is building', tr: 'Enerji yükseliyor', de: 'Energie baut sich auf' },
    tipFollicularDesc: {
      en: 'Estrogen is rising. Good timing for new projects, workouts, and social plans.',
      tr: 'Östrojen yükseliyor. Yeni projeler, egzersiz ve sosyal planlar için iyi bir zaman.',
      de: 'Der Östrogenspiegel steigt. Eine gute Zeit für neue Projekte, Workouts und soziale Pläne.',
    },
    tipOvulationTitle: { en: 'Peak energy window', tr: 'Zirve enerji dönemi', de: 'Phase höchster Energie' },
    tipOvulationDesc: {
      en: 'Communication and confidence tend to peak here. A good time for important conversations or bold moves.',
      tr: 'İletişim ve özgüven bu dönemde zirveye çıkar. Önemli konuşmalar veya cesur adımlar için iyi bir zaman.',
      de: 'Kommunikation und Selbstvertrauen erreichen hier oft ihren Höhepunkt. Eine gute Zeit für wichtige Gespräche oder mutige Schritte.',
    },
    tipLutealTitle: { en: 'Focus and wind down', tr: 'Odaklan ve yavaşla', de: 'Fokussieren und herunterfahren' },
    tipLutealDesc: {
      en: 'Great for deep, concentrated work early in this phase. Plan lighter days as it progresses.',
      tr: 'Bu fazın başlarında derin, yoğun çalışmalar için harika. İlerledikçe daha hafif günler planla.',
      de: 'Ideal für tiefe, konzentrierte Arbeit zu Beginn dieser Phase. Plane mit fortschreitender Phase ruhigere Tage ein.',
    },

    // --- Today: heads-up about most common symptom (getTodayInsights) ---
    // Title: "{label} likely today"
    headsUpTitle: { en: '{label} likely today', tr: 'Bugün muhtemelen {label}', de: '{label} heute wahrscheinlich' },
    // Description without severity:
    // "You've logged {label} in {pct}% of your {phase} days. Plan accordingly."
    headsUpDesc: {
      en: "You've logged {label} in {pct}% of your {phase} days. Plan accordingly.",
      tr: '{phase} günlerinin %{pct} kadarında {label} kaydettin. Buna göre planla.',
      de: 'Du hast {label} an {pct}% deiner Tage in der {phase} erfasst. Plane entsprechend.',
    },
    // Description with severity:
    // "You've logged {label} (usually {severity}) in {pct}% of your {phase} days. Plan accordingly."
    headsUpDescSeverity: {
      en: "You've logged {label} (usually {severity}) in {pct}% of your {phase} days. Plan accordingly.",
      tr: '{phase} günlerinin %{pct} kadarında {label} (genellikle {severity}) kaydettin. Buna göre planla.',
      de: 'Du hast {label} (meist {severity}) an {pct}% deiner Tage in der {phase} erfasst. Plane entsprechend.',
    },

    // --- Today: unusual symptom flag (getTodayInsights) ---
    // Title: "Unusual {label} today"
    unusualTitle: { en: 'Unusual {label} today', tr: 'Bugün alışılmadık {label}', de: 'Ungewöhnliche {label} heute' },
    // Description:
    // "You don't usually experience {label} during {phase} — only {pct}% of these days historically."
    unusualDesc: {
      en: "You don't usually experience {label} during {phase} — only {pct}% of these days historically.",
      tr: '{phase} sırasında genellikle {label} yaşamazsın — geçmişte bu günlerin yalnızca %{pct} kadarında.',
      de: 'Du erlebst {label} normalerweise nicht während der {phase} — historisch nur an {pct}% dieser Tage.',
    },

    // --- Personalized phase description (getPersonalizedPhaseDescription) ---
    // Single pattern:
    // "Based on your history, you tend to experience {parts} during this phase."
    personalizedSingle: {
      en: 'Based on your history, you tend to experience {parts} during this phase.',
      tr: 'Geçmişine göre bu fazda genellikle {parts} yaşıyorsun.',
      de: 'Basierend auf deinem Verlauf erlebst du in dieser Phase tendenziell {parts}.',
    },
    // Multiple patterns (same template — {parts} contains the joined list):
    personalizedMultiple: {
      en: 'Based on your history, you tend to experience {parts} during this phase.',
      tr: 'Geçmişine göre bu fazda genellikle {parts} yaşıyorsun.',
      de: 'Basierend auf deinem Verlauf erlebst du in dieser Phase tendenziell {parts}.',
    },
    // Part fragment without severity: "{label} ({pct}% of the time)"
    personalizedPart: {
      en: '{label} ({pct}% of the time)',
      tr: '{label} (zamanın %{pct} kadarı)',
      de: '{label} ({pct}% der Zeit)',
    },
    // Part fragment with severity: "{severity} {label} ({pct}% of the time)"
    personalizedPartSeverity: {
      en: '{severity} {label} ({pct}% of the time)',
      tr: '{severity} {label} (zamanın %{pct} kadarı)',
      de: '{label} ({severity}, {pct}% der Zeit)',
    },
    // List joiner words for assembling {parts}: items joined by ", " and a final "and".
    listAnd: { en: 'and', tr: 've', de: 'und' },
  },

  // ---------------------------------------------------------------------------
  // Share summary (App.tsx shareSummary) — currently concatenated, see notes.
  // ---------------------------------------------------------------------------
  share: {
    summaryHeader: { en: 'cycle vault summary', tr: 'cycle vault özeti', de: 'cycle vault Zusammenfassung' },
    summaryCycleDay: { en: 'Cycle day: {day}', tr: 'Döngü günü: {day}', de: 'Zyklustag: {day}' },
    summaryPhase: { en: 'Phase: {phase}', tr: 'Faz: {phase}', de: 'Phase: {phase}' },
    summaryNextPeriodOne: {
      en: 'Next period: in {count} day',
      tr: 'Sonraki regl: {count} gün içinde',
      de: 'Nächste Periode: in {count} Tag',
    },
    summaryNextPeriodOther: {
      en: 'Next period: in {count} days',
      tr: 'Sonraki regl: {count} gün içinde',
      de: 'Nächste Periode: in {count} Tagen',
    },
    summaryMood: { en: 'Mood: {value}', tr: 'Ruh hali: {value}', de: 'Stimmung: {value}' },
    summaryFlow: { en: 'Flow: {value}', tr: 'Kanama: {value}', de: 'Blutung: {value}' },
    summaryCramps: { en: 'Cramps: {value}', tr: 'Kramplar: {value}', de: 'Krämpfe: {value}' },
  },

  // ---------------------------------------------------------------------------
  // Legal (footer / disclaimers surfaced in-app; full policy lives in static
  // privacy.html / terms.html which are translated separately, not here)
  // ---------------------------------------------------------------------------
  legal: {
    notMedicalAdvice: {
      en: 'Not medical advice; not for contraception',
      tr: 'Tıbbi tavsiye değildir; doğum kontrolü için değildir',
      de: 'Keine medizinische Beratung; nicht zur Verhütung',
    },
    estimatesApproximate: {
      en: 'Calendar-based estimates are approximate — not for medical use.',
      tr: 'Takvim temelli tahminler yaklaşıktır — tıbbi kullanım için değildir.',
      de: 'Kalenderbasierte Schätzungen sind ungefähr — nicht für medizinische Zwecke geeignet.',
    },
  },

  // ---------------------------------------------------------------------------
  // Local notification copy (src/lib/notifications.ts). Keyed by copyKey +
  // 'Title'/'Body' (e.g. copyKey 'upcoming' → notif.upcomingTitle/upcomingBody).
  // Bodies use "day(s)" rather than plural variants so no plural selection is
  // needed in the scheduler.
  // ---------------------------------------------------------------------------
  notif: {
    upcomingTitle: { en: 'Period coming up', tr: 'Regl yaklaşıyor', de: 'Periode steht bevor' },
    upcomingBody: {
      en: 'Your period may start in {days} day(s).',
      tr: 'Reglin {days} gün içinde başlayabilir.',
      de: 'Deine Periode könnte in {days} Tag(en) beginnen.',
    },
    startDayTitle: { en: 'Period may start today', tr: 'Regl bugün başlayabilir', de: 'Periode könnte heute beginnen' },
    startDayBody: {
      en: 'Today is your predicted start day.',
      tr: 'Bugün tahmini başlangıç günün.',
      de: 'Heute ist dein voraussichtlicher Starttag.',
    },
    startConfirmTitle: { en: 'Did your period start?', tr: 'Reglin başladı mı?', de: 'Hat deine Periode begonnen?' },
    startConfirmBody: {
      en: 'Tap to log it so your predictions stay accurate.',
      tr: 'Tahminlerin doğru kalsın diye kaydetmek için dokun.',
      de: 'Tippe, um sie zu erfassen, damit deine Vorhersagen genau bleiben.',
    },
    duringPeriodTitle: { en: 'How are you feeling?', tr: 'Nasıl hissediyorsun?', de: 'Wie fühlst du dich?' },
    duringPeriodBody: {
      en: 'Log today’s flow and symptoms while your period is on.',
      tr: 'Reglin devam ederken bugünkü kanama ve belirtilerini kaydet.',
      de: 'Erfasse Blutung und Symptome von heute, während deine Periode läuft.',
    },
    endConfirmTitle: { en: 'Did your period end?', tr: 'Reglin bitti mi?', de: 'Ist deine Periode vorbei?' },
    endConfirmBody: {
      en: "You've been logged for {day} days — don't forget to log the end.",
      tr: 'Reglin {day} gündür kayıtlı — bitişi kaydetmeyi unutma.',
      de: 'Deine Periode ist seit {day} Tagen erfasst — vergiss nicht, das Ende einzutragen.',
    },
    ovulationTitle: { en: 'Ovulation day', tr: 'Yumurtlama günü', de: 'Eisprungtag' },
    ovulationBody: {
      en: 'Today is your predicted ovulation day.',
      tr: 'Bugün tahmini yumurtlama günün.',
      de: 'Heute ist dein voraussichtlicher Eisprung-Tag.',
    },
    fertileStartTitle: { en: 'Fertile window starting', tr: 'Doğurgan dönem başlıyor', de: 'Fruchtbare Tage beginnen' },
    fertileStartBody: {
      en: 'Your predicted fertile window begins today.',
      tr: 'Tahmini doğurgan dönemin bugün başlıyor.',
      de: 'Deine voraussichtlichen fruchtbaren Tage beginnen heute.',
    },
    tipMenstrualTitle: { en: 'Be kind to yourself', tr: 'Kendine iyi davran', de: 'Sei gut zu dir' },
    tipMenstrualBody: {
      en: 'Menstrual phase — rest and hydration help. Listen to your body.',
      tr: 'Menstrüel faz — dinlenmek ve su içmek iyi gelir. Bedenini dinle.',
      de: 'Menstruationsphase — Ruhe und Flüssigkeit helfen. Höre auf deinen Körper.',
    },
    tipFertileTitle: { en: 'Fertile phase', tr: 'Doğurgan dönem', de: 'Fruchtbare Tage' },
    tipFertileBody: {
      en: "You're entering your fertile phase.",
      tr: 'Doğurgan dönemine giriyorsun.',
      de: 'Deine fruchtbaren Tage beginnen.',
    },
    actionYes: { en: 'Yes, log it', tr: 'Evet, kaydet', de: 'Ja, erfassen' },
    actionNo: { en: 'Not yet', tr: 'Henüz değil', de: 'Noch nicht' },
    permissionDenied: {
      en: 'Notifications are blocked. Enable them in iOS Settings → cycle vault.',
      tr: 'Bildirimler engellenmiş. iOS Ayarlar → cycle vault üzerinden etkinleştir.',
      de: 'Benachrichtigungen sind blockiert. Aktiviere sie in iOS-Einstellungen → cycle vault.',
    },
    webUnavailable: {
      en: 'Notifications are only available in the installed app.',
      tr: 'Bildirimler yalnızca yüklü uygulamada kullanılabilir.',
      de: 'Benachrichtigungen sind nur in der installierten App verfügbar.',
    },
  },
} as const satisfies Record<string, Record<string, TranslationEntry>>;

/** Convenience: every translation group name. */
export type TranslationGroup = keyof typeof translations;
