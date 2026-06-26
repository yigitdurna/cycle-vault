// --- Data types (matching localStorage format) ---

export interface Cycle {
  start: string; // "YYYY-MM-DD"
  end: string | null;
}

// --- Phase prediction results ---

export type PhaseType = 'period' | 'fertile' | 'ovulation' | 'luteal' | 'follicular' | 'future';

export interface PhaseResult {
  type: PhaseType;
  day?: number;
  recorded?: boolean;
  msg?: string;
  fertileStart?: Date;
  fertileEnd?: Date;
}

// --- UI phase types (for theming/display) ---

export type CyclePhase = 'Menstrual' | 'Follicular' | 'Ovulation' | 'Luteal';

export interface PhaseInfo {
  name: CyclePhase;
  color: string;
  description: string;
  range: [number, number];
  gradient: string;
}

export const PHASES: Record<CyclePhase, PhaseInfo> = {
  Menstrual: {
    name: 'Menstrual',
    color: 'var(--color-menstrual)',
    description: 'Your body is shedding the uterine lining. Focus on rest and gentle movement.',
    range: [1, 5],
    gradient: 'from-rose-200/70 via-rose-100/40 to-bg',
  },
  Follicular: {
    name: 'Follicular',
    color: 'var(--color-follicular)',
    description: 'Estrogen levels are rising. You might feel more energetic and creative.',
    range: [6, 9],
    gradient: 'from-emerald-200/60 via-emerald-100/35 to-bg',
  },
  Ovulation: {
    name: 'Ovulation',
    color: 'var(--color-ovulation)',
    description: 'Estimated fertile window. Calendar-based estimates are approximate — not for medical use.',
    range: [10, 16],
    gradient: 'from-amber-200/60 via-amber-100/35 to-bg',
  },
  Luteal: {
    name: 'Luteal',
    color: 'var(--color-luteal)',
    description: 'Progesterone rises. Focus on grounding activities and self-care.',
    range: [17, 28],
    gradient: 'from-purple-200/55 via-purple-100/30 to-bg',
  },
};

/** Map engine phase type → UI phase */
export function phaseTypeToUI(type: PhaseType, hideFertility = false): CyclePhase {
  switch (type) {
    case 'period': return 'Menstrual';
    // In childfree / not-TTC mode, fertile and ovulation days are presented as
    // the surrounding Follicular phase so no fertility framing surfaces.
    case 'fertile': return 'Follicular'; // fertile window is during follicular
    case 'ovulation': return hideFertility ? 'Follicular' : 'Ovulation';
    case 'luteal': return 'Luteal';
    case 'follicular': return 'Follicular';
    case 'future': return 'Follicular'; // default
  }
}

// --- Symptom tracking types ---

export type Severity = 1 | 2 | 3;
export type SleepQuality = 1 | 2 | 3;
export type MoodValue = 'anxious' | 'sad' | 'irritable' | 'energetic' | 'calm' | 'happy';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export interface PainLog {
  locations: ('head' | 'breast' | 'back' | 'joints')[];
  severity: Severity;
}

export interface SymptomSnapshot {
  timestamp: string; // ISO 8601
  mood?: MoodValue[];
  energy?: Severity;
  cramps?: Severity;
  sleep?: SleepQuality;
  flow?: FlowLevel;
  pain?: PainLog;
  functionalImpact?: boolean;
  note?: string;
}

export interface DayLog {
  date: string;
  mood?: MoodValue[];
  energy?: Severity;
  cramps?: Severity;
  sleep?: SleepQuality;
  flow?: FlowLevel;
  pain?: PainLog;
  functionalImpact?: boolean;
  note?: string;
  history?: SymptomSnapshot[];
}

export type DayLogs = Record<string, DayLog>;

// --- Insight types ---

export interface PhaseSymptomPattern {
  symptom: string;
  phase: CyclePhase;
  occurrences: number;
  totalDaysInPhase: number;
  frequency: number;
  avgSeverity?: number;
}

export interface CycleLengthAlert {
  currentLength: number;
  medianLength: number;
  deviation: number;
  message: string;
}

export interface Insight {
  id: string;
  category: 'pattern' | 'anomaly' | 'cycle-length' | 'prediction';
  title: string;
  description: string;
  phase?: CyclePhase;
  confidence: number;
}
