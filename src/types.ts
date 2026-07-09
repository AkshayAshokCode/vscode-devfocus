export enum TimerPhase {
  WORK = 'WORK',
  BREAK = 'BREAK',
  LONG_BREAK = 'LONG_BREAK',
}

export enum TimerState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
}

export enum PomodoroMode {
  CLASSIC = 'CLASSIC',
  DEEP_WORK = 'DEEP_WORK',
  CUSTOM = 'CUSTOM',
}

export interface PomodoroSettings {
  mode: PomodoroMode;
  sessionMinutes: number;
  breakMinutes: number;
  sessionsPerRound: number;
  longBreakMinutes: number;
  longBreakAfter: number;
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD (UTC, matching lastSessionDate)
  sessions: number;
  focusMs: number;
  breaksTaken: number;
  breaksSkipped: number;
  tasksPlanned?: number;
  tasksDone?: number;
}

export interface PlanTask {
  id: string;
  label: string;
  done: boolean;
  sessions: number;
}

export interface LaterTask {
  id: string;
  label: string;
  addedDate: string; // YYYY-MM-DD
  sessions?: number; // survives a same-day Today→Later→Today round trip; cleared at rollover
}

export interface TimerSnapshot {
  state: TimerState;
  phase: TimerPhase;
  timeDisplay: string;
  progress: number;
  currentSession: number;
  settings: PomodoroSettings;
  dailyCount: number;
  dailyGoal: number;
  focusMsToday: number;
  breaksSkippedToday: number;
  windDown: boolean;
  history: DailyRecord[];
  microBreakActive: boolean;
  planTasks: PlanTask[];
  activeTaskId: string | null;
  laterTasks: LaterTask[];
  soundEnabled: boolean;
  autoStartNextSession: boolean;
  taskLabel: string;
  firstRun: boolean;
}

export interface PersistedState {
  remainingTimeMs: number;
  currentSession: number;
  phase: TimerPhase;
  timerWasRunning: boolean;
  settings: PomodoroSettings;
  completedSessionsToday: number;
  breaksSkippedToday: number;
  breaksTakenToday: number;
  focusMsToday: number;
  history: DailyRecord[];
  planTasks: PlanTask[];
  activeTaskId: string | null;
  laterTasks: LaterTask[];
  lastSessionDate: string;
  soundEnabled: boolean;
  autoStartNextSession: boolean;
  taskLabel: string;
}

export type ExtToWebMsg =
  | { type: 'timerUpdate'; payload: TimerSnapshot };

export type WebToExtMsg =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'reset' }
  | { type: 'skipBreak' }
  | { type: 'microBreak' }
  | { type: 'toggleSound' }
  | { type: 'setTask'; label: string }
  | { type: 'addTask'; label: string }
  | { type: 'toggleTaskDone'; id: string }
  | { type: 'setActiveTask'; id: string }
  | { type: 'demoteTask'; id: string }
  | { type: 'promoteTask'; id: string }
  | { type: 'deleteLaterTask'; id: string }
  | { type: 'clearOldLater' }
  | { type: 'triageOpenTasks' }
  | { type: 'applyMode'; mode: PomodoroMode }
  | { type: 'applyCustomSettings'; sessionMinutes: number; breakMinutes: number; sessionsPerRound: number; longBreakMinutes: number }
  | { type: 'openSettings' };

export const PRESET_SETTINGS: Record<PomodoroMode, PomodoroSettings> = {
  [PomodoroMode.CLASSIC]: {
    mode: PomodoroMode.CLASSIC,
    sessionMinutes: 25,
    breakMinutes: 5,
    sessionsPerRound: 4,
    longBreakMinutes: 15,
    longBreakAfter: 4,
  },
  [PomodoroMode.DEEP_WORK]: {
    mode: PomodoroMode.DEEP_WORK,
    sessionMinutes: 50,
    breakMinutes: 10,
    sessionsPerRound: 4,
    longBreakMinutes: 30,
    longBreakAfter: 4,
  },
  [PomodoroMode.CUSTOM]: {
    mode: PomodoroMode.CUSTOM,
    sessionMinutes: 25,
    breakMinutes: 5,
    sessionsPerRound: 4,
    longBreakMinutes: 15,
    longBreakAfter: 4,
  },
};
