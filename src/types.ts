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

export interface TimerSnapshot {
  state: TimerState;
  phase: TimerPhase;
  timeDisplay: string;
  progress: number;
  currentSession: number;
  settings: PomodoroSettings;
  dailyCount: number;
  soundEnabled: boolean;
  autoStartNextSession: boolean;
  taskLabel: string;
}

export interface PersistedState {
  remainingTimeMs: number;
  currentSession: number;
  phase: TimerPhase;
  timerWasRunning: boolean;
  settings: PomodoroSettings;
  completedSessionsToday: number;
  lastSessionDate: string;
  soundEnabled: boolean;
  autoStartNextSession: boolean;
  taskLabel: string;
}

export type ExtToWebMsg =
  | { type: 'timerUpdate'; payload: TimerSnapshot }
  | { type: 'playSound'; uri: string };

export type WebToExtMsg =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'reset' }
  | { type: 'skipBreak' }
  | { type: 'toggleSound' }
  | { type: 'setTask'; label: string }
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
