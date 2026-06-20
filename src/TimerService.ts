import * as vscode from 'vscode';
import {
  TimerPhase,
  TimerState,
  PomodoroMode,
  PomodoroSettings,
  TimerSnapshot,
  PersistedState,
  PRESET_SETTINGS,
} from './types';

const PERSIST_KEY = 'devfocus.state';
const PERSIST_INTERVAL_TICKS = 30;
const MILESTONE_INTERVAL = 5;

export class TimerService {
  private state: TimerState = TimerState.IDLE;
  private phase: TimerPhase = TimerPhase.WORK;
  private remainingMs: number;
  private totalMs: number;
  private currentSession: number = 1;
  private settings: PomodoroSettings;
  private completedSessionsToday: number = 0;
  private lastSessionDate: string = '';
  private soundEnabled: boolean;
  private autoStartNextSession: boolean;
  private notificationsEnabled: boolean;
  private taskLabel: string = '';
  private tickCount: number = 0;
  private intervalHandle: ReturnType<typeof setInterval> | undefined;

  onSnapshot: (snap: TimerSnapshot) => void = () => {};
  onPlaySound: (sound: 'work' | 'break' | 'complete') => void = () => {};
  onNotify: (title: string, body: string, actionText?: string, actionCallback?: () => void) => void = () => {};

  constructor(private readonly context: vscode.ExtensionContext) {
    const cfg = vscode.workspace.getConfiguration('devfocus');
    this.soundEnabled = cfg.get('soundEnabled', true);
    this.autoStartNextSession = cfg.get('autoStartNextSession', true);
    this.notificationsEnabled = cfg.get('notificationsEnabled', true);

    const defaultMode = cfg.get<string>('defaultMode', 'CLASSIC') as PomodoroMode;
    this.settings = { ...PRESET_SETTINGS[defaultMode] ?? PRESET_SETTINGS[PomodoroMode.CLASSIC] };
    // Override longBreakMinutes from setting for fresh CUSTOM starts
    if (defaultMode === PomodoroMode.CUSTOM) {
      this.settings.longBreakMinutes = cfg.get('longBreakMinutes', 15);
    }

    this.remainingMs = this.settings.sessionMinutes * 60 * 1000;
    this.totalMs = this.remainingMs;
    this.restoreState();
    this.intervalHandle = setInterval(() => this.tick(), 1000);
    context.subscriptions.push({ dispose: () => this.dispose() });
  }

  private restoreState(): void {
    const saved = this.context.globalState.get<PersistedState>(PERSIST_KEY);
    if (!saved) return;

    this.settings = saved.settings ?? this.settings;
    this.currentSession = saved.currentSession ?? 1;
    this.phase = saved.phase ?? TimerPhase.WORK;
    this.completedSessionsToday = saved.completedSessionsToday ?? 0;
    this.lastSessionDate = saved.lastSessionDate ?? '';
    this.soundEnabled = saved.soundEnabled ?? this.soundEnabled;
    this.autoStartNextSession = saved.autoStartNextSession ?? this.autoStartNextSession;
    this.taskLabel = saved.taskLabel ?? '';

    this.checkDailyReset();

    this.totalMs = this.phaseMinutes(this.phase) * 60 * 1000;
    this.remainingMs = Math.min(saved.remainingTimeMs ?? this.totalMs, this.totalMs);

    // Restore as paused if it was running — user can manually resume
    this.state = saved.timerWasRunning ? TimerState.PAUSED : TimerState.IDLE;
  }

  private persistState(): void {
    const s: PersistedState = {
      remainingTimeMs: this.remainingMs,
      currentSession: this.currentSession,
      phase: this.phase,
      timerWasRunning: this.state === TimerState.RUNNING,
      settings: this.settings,
      completedSessionsToday: this.completedSessionsToday,
      lastSessionDate: this.lastSessionDate,
      soundEnabled: this.soundEnabled,
      autoStartNextSession: this.autoStartNextSession,
      taskLabel: this.taskLabel,
    };
    this.context.globalState.update(PERSIST_KEY, s);
  }

  private checkDailyReset(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastSessionDate !== today) {
      this.completedSessionsToday = 0;
      this.lastSessionDate = today;
    }
  }

  private tick(): void {
    if (this.state !== TimerState.RUNNING) {
      this.onSnapshot(this.buildSnapshot());
      return;
    }

    this.remainingMs -= 1000;
    this.tickCount++;

    if (this.tickCount % PERSIST_INTERVAL_TICKS === 0) {
      this.persistState();
    }

    if (this.remainingMs <= 0) {
      this.handlePhaseComplete();
    } else {
      this.onSnapshot(this.buildSnapshot());
    }
  }

  private handlePhaseComplete(): void {
    if (this.phase === TimerPhase.WORK) {
      this.checkDailyReset();
      this.completedSessionsToday++;

      // Milestone notification every N sessions
      if (this.completedSessionsToday % MILESTONE_INTERVAL === 0) {
        const n = this.completedSessionsToday;
        const msg = n === MILESTONE_INTERVAL
          ? `${n} sessions today — you're on a roll! 🔥`
          : `${n} sessions today! Keep going! 🏆`;
        if (this.notificationsEnabled) {
          this.onNotify('🎯 Milestone!', msg);
        }
      }

      const isLastSession = this.currentSession >= this.settings.sessionsPerRound;
      if (isLastSession) {
        this.phase = TimerPhase.LONG_BREAK;
        this.totalMs = this.settings.longBreakMinutes * 60 * 1000;
        this.remainingMs = this.totalMs;
        this.state = TimerState.RUNNING;
        if (this.soundEnabled) { this.onPlaySound('complete'); }
        if (this.notificationsEnabled) {
          this.onNotify(
            '🎉 Round Complete!',
            `${this.settings.sessionsPerRound} sessions done! Starting long break.`,
          );
        }
      } else {
        this.phase = TimerPhase.BREAK;
        this.totalMs = this.settings.breakMinutes * 60 * 1000;
        this.remainingMs = this.totalMs;
        this.state = TimerState.RUNNING;
        if (this.soundEnabled) { this.onPlaySound('work'); }
        if (this.notificationsEnabled) {
          this.onNotify(
            '✅ Session Complete!',
            `Session ${this.currentSession} done. Break time!`,
          );
        }
      }
    } else {
      const wasLongBreak = this.phase === TimerPhase.LONG_BREAK;
      if (wasLongBreak) {
        this.currentSession = 1;
      } else {
        this.currentSession++;
      }

      this.phase = TimerPhase.WORK;
      this.totalMs = this.settings.sessionMinutes * 60 * 1000;
      this.remainingMs = this.totalMs;

      if (this.soundEnabled) { this.onPlaySound('break'); }

      if (this.autoStartNextSession) {
        this.state = TimerState.RUNNING;
        if (this.notificationsEnabled) {
          this.onNotify('▶️ Back to Work!', `Starting session ${this.currentSession}.`);
        }
      } else {
        this.state = TimerState.IDLE;
        if (this.notificationsEnabled) {
          this.onNotify(
            '☕ Break Over',
            `Ready for session ${this.currentSession}?`,
            'Start Session',
            () => this.start(),
          );
        }
      }
    }

    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  private phaseMinutes(phase: TimerPhase): number {
    switch (phase) {
      case TimerPhase.WORK:       return this.settings.sessionMinutes;
      case TimerPhase.BREAK:      return this.settings.breakMinutes;
      case TimerPhase.LONG_BREAK: return this.settings.longBreakMinutes;
    }
  }

  private buildSnapshot(): TimerSnapshot {
    const totalSec = Math.ceil(this.remainingMs / 1000);
    const minutes = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const seconds = (totalSec % 60).toString().padStart(2, '0');
    const progress = this.totalMs > 0 ? 1 - this.remainingMs / this.totalMs : 0;

    return {
      state: this.state,
      phase: this.phase,
      timeDisplay: `${minutes}:${seconds}`,
      progress: Math.max(0, Math.min(1, progress)),
      currentSession: this.currentSession,
      settings: { ...this.settings },
      dailyCount: this.completedSessionsToday,
      soundEnabled: this.soundEnabled,
      autoStartNextSession: this.autoStartNextSession,
      taskLabel: this.taskLabel,
    };
  }

  // --- Public API ---

  start(): void {
    if (this.state === TimerState.IDLE || this.state === TimerState.PAUSED) {
      this.state = TimerState.RUNNING;
      this.persistState();
      this.onSnapshot(this.buildSnapshot());
    }
  }

  pause(): void {
    if (this.state === TimerState.RUNNING) {
      this.state = TimerState.PAUSED;
      this.persistState();
      this.onSnapshot(this.buildSnapshot());
    }
  }

  toggle(): void {
    if (this.state === TimerState.RUNNING) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset(): void {
    this.state = TimerState.IDLE;
    this.phase = TimerPhase.WORK;
    this.currentSession = 1;
    this.totalMs = this.settings.sessionMinutes * 60 * 1000;
    this.remainingMs = this.totalMs;
    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  skipBreak(): void {
    if (this.phase === TimerPhase.BREAK || this.phase === TimerPhase.LONG_BREAK) {
      const wasLongBreak = this.phase === TimerPhase.LONG_BREAK;
      if (wasLongBreak) {
        this.currentSession = 1;
      } else {
        this.currentSession++;
      }
      this.phase = TimerPhase.WORK;
      this.totalMs = this.settings.sessionMinutes * 60 * 1000;
      this.remainingMs = this.totalMs;
      this.state = TimerState.IDLE;
      this.persistState();
      this.onSnapshot(this.buildSnapshot());
    }
  }

  toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    // Write back to VSCode config so it survives reloads and syncs with settings UI
    vscode.workspace.getConfiguration('devfocus')
      .update('soundEnabled', this.soundEnabled, vscode.ConfigurationTarget.Global)
      .then(undefined, () => {});
    this.onSnapshot(this.buildSnapshot());
  }

  setTask(label: string): void {
    this.taskLabel = label.trim().slice(0, 60);
    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  applyMode(mode: PomodoroMode): void {
    this.settings = { ...PRESET_SETTINGS[mode] };
    // Apply user's longBreakMinutes setting for custom mode
    if (mode === PomodoroMode.CUSTOM) {
      const cfg = vscode.workspace.getConfiguration('devfocus');
      this.settings.longBreakMinutes = cfg.get('longBreakMinutes', 15);
    }
    this.reset();
  }

  applyCustomSettings(
    sessionMinutes: number,
    breakMinutes: number,
    sessionsPerRound: number,
    longBreakMinutes: number,
  ): void {
    this.settings = {
      ...this.settings,
      mode: PomodoroMode.CUSTOM,
      sessionMinutes,
      breakMinutes,
      sessionsPerRound,
      longBreakMinutes,
      longBreakAfter: sessionsPerRound,
    };
    this.reset();
  }

  reloadVscodeSettings(): void {
    const cfg = vscode.workspace.getConfiguration('devfocus');
    this.soundEnabled = cfg.get('soundEnabled', true);
    this.autoStartNextSession = cfg.get('autoStartNextSession', true);
    this.notificationsEnabled = cfg.get('notificationsEnabled', true);
    this.onSnapshot(this.buildSnapshot());
  }

  getSnapshot(): TimerSnapshot {
    return this.buildSnapshot();
  }

  private dispose(): void {
    if (this.intervalHandle !== undefined) {
      clearInterval(this.intervalHandle);
    }
    this.persistState();
  }
}
