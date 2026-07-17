import * as vscode from 'vscode';
import {
  TimerPhase,
  TimerState,
  PomodoroMode,
  PomodoroSettings,
  TimerSnapshot,
  PersistedState,
  DailyRecord,
  PlanTask,
  LaterTask,
  PRESET_SETTINGS,
} from './types';

const PERSIST_KEY = 'devfocus.state';
const PERSIST_INTERVAL_TICKS = 30;
const MILESTONE_INTERVAL = 5;
const PLAN_MAX = 5;
const LATER_MAX = 10; // gates manual adds only; demotion and rollover always succeed
const LATER_STALE_DAYS = 7;

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export class TimerService {
  private state: TimerState = TimerState.IDLE;
  private phase: TimerPhase = TimerPhase.WORK;
  private remainingMs: number;
  private totalMs: number;
  // Wall-clock deadline for a running break/long break (WORK uses tick-count instead — see tick()).
  // Non-null only while state is RUNNING and phase isn't WORK.
  private phaseEndsAt: number | null = null;
  private currentSession: number = 1;
  private settings: PomodoroSettings;
  private completedSessionsToday: number = 0;
  private breaksSkippedToday: number = 0;
  private breaksTakenToday: number = 0;
  private focusMsToday: number = 0;
  private history: DailyRecord[] = [];
  private planTasks: PlanTask[] = [];
  private activeTaskId: string | null = null;
  private laterTasks: LaterTask[] = [];
  private lastSessionDate: string = '';
  private soundEnabled: boolean;
  private autoStartNextSession: boolean;
  private notificationsEnabled: boolean;
  private dailyGoal: number;
  private windDownTime: string;
  private taskLabel: string = '';
  private firstRun: boolean = false;
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
    this.dailyGoal = cfg.get('dailyGoal', 8);
    this.windDownTime = cfg.get('windDownTime', '18:00');

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
    if (!saved) {
      // Nothing persisted yet — show the first-run setup screen
      this.firstRun = true;
      return;
    }

    this.settings = saved.settings ?? this.settings;
    this.currentSession = saved.currentSession ?? 1;
    this.phase = saved.phase ?? TimerPhase.WORK;
    this.completedSessionsToday = saved.completedSessionsToday ?? 0;
    this.breaksSkippedToday = saved.breaksSkippedToday ?? 0;
    this.breaksTakenToday = saved.breaksTakenToday ?? 0;
    this.focusMsToday = saved.focusMsToday ?? 0;
    this.history = saved.history ?? [];
    this.planTasks = saved.planTasks ?? [];
    this.activeTaskId = saved.activeTaskId ?? null;
    this.laterTasks = saved.laterTasks ?? [];
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
      breaksSkippedToday: this.breaksSkippedToday,
      breaksTakenToday: this.breaksTakenToday,
      focusMsToday: this.focusMsToday,
      history: this.history,
      planTasks: this.planTasks,
      activeTaskId: this.activeTaskId,
      laterTasks: this.laterTasks,
      lastSessionDate: this.lastSessionDate,
      soundEnabled: this.soundEnabled,
      autoStartNextSession: this.autoStartNextSession,
      taskLabel: this.taskLabel,
    };
    this.context.globalState.update(PERSIST_KEY, s);
  }

  private checkDailyReset(): void {
    const today = isoDate(new Date());
    if (this.lastSessionDate !== today) {
      // Archive the finished day before zeroing the counters
      if (this.lastSessionDate && (this.completedSessionsToday > 0 || this.focusMsToday > 0)) {
        this.history.push({
          date: this.lastSessionDate,
          sessions: this.completedSessionsToday,
          focusMs: this.focusMsToday,
          breaksTaken: this.breaksTakenToday,
          breaksSkipped: this.breaksSkippedToday,
          tasksPlanned: this.planTasks.length || undefined,
          tasksDone: this.planTasks.filter(t => t.done).length || undefined,
        });
      }

      // Done tasks become numbers; unfinished ones wait in Later for tomorrow
      const unfinished = this.planTasks.filter(t => !t.done);
      if (unfinished.length > 0) {
        this.laterTasks.push(
          ...unfinished.map(t => ({ id: t.id, label: t.label, addedDate: today })),
        );
      }
      // Session tallies don't survive the day (Later carries no metadata across days)
      this.laterTasks = this.laterTasks.map(({ id, label, addedDate }) => ({ id, label, addedDate }));
      if (this.planTasks.length > 0) {
        this.taskLabel = '';
      }
      this.planTasks = [];
      this.activeTaskId = null;

      this.completedSessionsToday = 0;
      this.breaksSkippedToday = 0;
      this.breaksTakenToday = 0;
      this.focusMsToday = 0;
      this.lastSessionDate = today;
    }
  }

  private isWindDown(): boolean {
    const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(this.windDownTime);
    if (!m) return false;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    return nowMins >= parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  }

  private tick(): void {
    // Midnight rollover — archive yesterday even if the editor sat open overnight
    if (this.lastSessionDate && this.lastSessionDate !== isoDate(new Date())) {
      this.checkDailyReset();
      this.persistState();
    }

    if (this.state !== TimerState.RUNNING) {
      this.onSnapshot(this.buildSnapshot());
      return;
    }

    if (this.phase !== TimerPhase.WORK && this.phaseEndsAt !== null) {
      // Breaks track real elapsed time, so a system sleep/lock doesn't silently
      // pause a break the user actually took — it's already over on wake, same as
      // if they'd stood up and walked away from an analog clock.
      this.remainingMs = Math.max(0, this.phaseEndsAt - Date.now());
    } else {
      this.remainingMs -= 1000;
    }
    this.tickCount++;
    if (this.phase === TimerPhase.WORK) {
      this.focusMsToday += 1000;
    }

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

      // Attribute the finished session to the active task
      const active = this.planTasks.find(t => t.id === this.activeTaskId);
      if (active) {
        active.sessions++;
      }

      // Daily goal takes precedence over the generic milestone
      const n = this.completedSessionsToday;
      if (this.notificationsEnabled) {
        if (this.dailyGoal > 0 && n === this.dailyGoal) {
          this.onNotify(`Goal met — ${n} sessions. Everything from here is bonus.`, '');
        } else if (n % MILESTONE_INTERVAL === 0) {
          this.onNotify(`${n} sessions today. Make the next break a real one.`, '');
        }
      }

      const isLastSession = this.currentSession >= this.settings.sessionsPerRound;
      if (isLastSession) {
        this.phase = TimerPhase.LONG_BREAK;
        this.totalMs = this.settings.longBreakMinutes * 60 * 1000;
        this.remainingMs = this.totalMs;
        this.state = TimerState.RUNNING;
        this.phaseEndsAt = Date.now() + this.totalMs;
        if (this.soundEnabled) { this.onPlaySound('complete'); }
        if (this.notificationsEnabled) {
          this.onNotify(
            `Round complete — step away for ${this.settings.longBreakMinutes} minutes.`,
            '',
          );
        }
      } else {
        this.phase = TimerPhase.BREAK;
        this.totalMs = this.settings.breakMinutes * 60 * 1000;
        this.remainingMs = this.totalMs;
        this.state = TimerState.RUNNING;
        this.phaseEndsAt = Date.now() + this.totalMs;
        if (this.soundEnabled) { this.onPlaySound('work'); }
        if (this.notificationsEnabled) {
          this.onNotify(
            `Session ${this.currentSession} done — take ${this.settings.breakMinutes} minutes away from the screen.`,
            '',
          );
        }
      }
    } else {
      const wasLongBreak = this.phase === TimerPhase.LONG_BREAK;
      this.breaksTakenToday++;
      if (wasLongBreak) {
        this.currentSession = 1;
      } else {
        this.currentSession++;
      }

      this.phase = TimerPhase.WORK;
      this.totalMs = this.settings.sessionMinutes * 60 * 1000;
      this.remainingMs = this.totalMs;
      this.phaseEndsAt = null;

      if (this.soundEnabled) { this.onPlaySound('break'); }

      if (this.autoStartNextSession) {
        this.state = TimerState.RUNNING;
        if (this.notificationsEnabled) {
          this.onNotify(
            `Session ${this.currentSession} of ${this.settings.sessionsPerRound} starting.`,
            '',
          );
        }
      } else {
        this.state = TimerState.IDLE;
        if (this.notificationsEnabled) {
          this.onNotify(
            `Session ${this.currentSession} is ready when you are.`,
            '',
            'Start session',
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
      dailyGoal: this.dailyGoal,
      focusMsToday: this.focusMsToday,
      breaksSkippedToday: this.breaksSkippedToday,
      windDown: this.isWindDown(),
      history: this.history.slice(-7),
      planTasks: this.planTasks.map(t => ({ ...t })),
      activeTaskId: this.activeTaskId,
      laterTasks: this.laterTasks.map(t => ({ ...t })),
      soundEnabled: this.soundEnabled,
      autoStartNextSession: this.autoStartNextSession,
      taskLabel: this.taskLabel,
      firstRun: this.firstRun,
    };
  }

  // --- Public API ---

  start(): void {
    if (this.state === TimerState.IDLE || this.state === TimerState.PAUSED) {
      this.firstRun = false;
      this.state = TimerState.RUNNING;
      if (this.phase !== TimerPhase.WORK) {
        this.phaseEndsAt = Date.now() + this.remainingMs;
      }
      this.persistState();
      this.onSnapshot(this.buildSnapshot());
    }
  }

  pause(): void {
    if (this.state === TimerState.RUNNING) {
      this.state = TimerState.PAUSED;
      if (this.phaseEndsAt !== null) {
        // Freeze whatever real time was left — a manual pause is deliberate, unlike
        // a sleep/lock, so it should behave the same way focus pausing does.
        this.remainingMs = Math.max(0, this.phaseEndsAt - Date.now());
        this.phaseEndsAt = null;
      }
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
    this.phaseEndsAt = null;
    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  skipBreak(): void {
    if (this.phase === TimerPhase.BREAK || this.phase === TimerPhase.LONG_BREAK) {
      this.checkDailyReset();
      this.breaksSkippedToday++;
      const wasLongBreak = this.phase === TimerPhase.LONG_BREAK;
      if (wasLongBreak) {
        this.currentSession = 1;
      } else {
        this.currentSession++;
      }
      this.phase = TimerPhase.WORK;
      this.totalMs = this.settings.sessionMinutes * 60 * 1000;
      this.remainingMs = this.totalMs;
      this.phaseEndsAt = null;
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
    const trimmed = label.trim().slice(0, 60);
    const active = this.planTasks.find(t => t.id === this.activeTaskId);
    if (active) {
      // With a plan, the intent IS the active task — editing it renames the task
      if (!trimmed) return; // never rename a task to nothing
      active.label = trimmed;
    }
    this.taskLabel = trimmed;
    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  // --- Day plan (Today + Later) ---

  private syncActiveTask(): void {
    const active = this.planTasks.find(t => t.id === this.activeTaskId && !t.done);
    if (!active) {
      const next = this.planTasks.find(t => !t.done);
      this.activeTaskId = next ? next.id : null;
      this.taskLabel = next ? next.label : '';
    } else {
      this.taskLabel = active.label;
    }
  }

  private commitPlanChange(): void {
    this.persistState();
    this.onSnapshot(this.buildSnapshot());
  }

  addTask(label: string): void {
    this.checkDailyReset();
    const trimmed = label.trim().slice(0, 60);
    if (!trimmed || this.planTasks.length >= PLAN_MAX) return;
    this.planTasks.push({ id: uid(), label: trimmed, done: false, sessions: 0 });
    if (!this.activeTaskId) this.syncActiveTask();
    this.commitPlanChange();
  }

  completeActiveTask(): void {
    if (this.activeTaskId) {
      this.toggleTaskDone(this.activeTaskId);
    }
  }

  /** Renames a task, whether it's in Today or Later — ids are unique across both. */
  editTask(id: string, label: string): void {
    const trimmed = label.trim().slice(0, 60);
    if (!trimmed) return; // never blank a task via edit — deleting is a separate, explicit action
    const task = this.planTasks.find(t => t.id === id) ?? this.laterTasks.find(t => t.id === id);
    if (!task) return;
    task.label = trimmed;
    if (id === this.activeTaskId) {
      this.taskLabel = trimmed; // keep the live intent (status bar, focus screen) in sync
    }
    this.commitPlanChange();
  }

  /** Reorders within Today's open tasks only — done tasks always sink to the bottom regardless. */
  reorderTask(id: string, direction: 'up' | 'down'): void {
    const openIndices = this.planTasks
      .map((t, i) => ({ done: t.done, i }))
      .filter(x => !x.done)
      .map(x => x.i);
    const pos = openIndices.findIndex(i => this.planTasks[i].id === id);
    if (pos === -1) return;
    const swapWith = direction === 'up' ? pos - 1 : pos + 1;
    if (swapWith < 0 || swapWith >= openIndices.length) return;
    const a = openIndices[pos];
    const b = openIndices[swapWith];
    [this.planTasks[a], this.planTasks[b]] = [this.planTasks[b], this.planTasks[a]];
    this.commitPlanChange();
  }

  toggleTaskDone(id: string): void {
    const task = this.planTasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    this.syncActiveTask();
    this.commitPlanChange();
  }

  setActiveTask(id: string): void {
    const task = this.planTasks.find(t => t.id === id && !t.done);
    if (!task) return;
    this.activeTaskId = task.id;
    this.taskLabel = task.label;
    this.commitPlanChange();
  }

  demoteTask(id: string): void {
    const task = this.planTasks.find(t => t.id === id);
    if (!task) return;
    this.planTasks = this.planTasks.filter(t => t.id !== id);
    // Demotion always succeeds — the Later cap gates manual adds only
    this.laterTasks.push({
      id: task.id,
      label: task.label,
      addedDate: isoDate(new Date()),
      sessions: task.sessions || undefined,
    });
    this.syncActiveTask();
    this.commitPlanChange();
  }

  promoteTask(id: string): void {
    const task = this.laterTasks.find(t => t.id === id);
    if (!task || this.planTasks.length >= PLAN_MAX) return;
    this.laterTasks = this.laterTasks.filter(t => t.id !== id);
    this.planTasks.push({
      id: task.id,
      label: task.label,
      done: false,
      sessions: task.sessions ?? 0, // a same-day round trip keeps its tally
    });
    if (!this.activeTaskId) this.syncActiveTask();
    this.commitPlanChange();
  }

  deleteLaterTask(id: string): void {
    this.laterTasks = this.laterTasks.filter(t => t.id !== id);
    this.commitPlanChange();
  }

  clearOldLater(): void {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - LATER_STALE_DAYS);
    const cutoffIso = isoDate(cutoff);
    this.laterTasks = this.laterTasks.filter(t => t.addedDate >= cutoffIso);
    this.commitPlanChange();
  }

  triageOpenTasks(): void {
    // Wind-down sweep: everything unfinished goes to Later in one click
    const today = isoDate(new Date());
    const open = this.planTasks.filter(t => !t.done);
    this.laterTasks.push(
      ...open.map(t => ({ id: t.id, label: t.label, addedDate: today, sessions: t.sessions || undefined })),
    );
    this.planTasks = this.planTasks.filter(t => t.done);
    this.activeTaskId = null;
    this.taskLabel = '';
    this.commitPlanChange();
  }

  /** Capture from anywhere (command / URI). Returns false when the Later cap blocks it. */
  captureLater(label: string): boolean {
    const trimmed = label.trim().slice(0, 60);
    if (!trimmed) return true;
    if (this.laterTasks.length >= LATER_MAX) return false;
    this.laterTasks.push({ id: uid(), label: trimmed, addedDate: isoDate(new Date()) });
    this.commitPlanChange();
    return true;
  }

  applyMode(mode: PomodoroMode): void {
    this.firstRun = false;
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
    this.dailyGoal = cfg.get('dailyGoal', 8);
    this.windDownTime = cfg.get('windDownTime', '18:00');
    this.onSnapshot(this.buildSnapshot());
  }

  getSnapshot(): TimerSnapshot {
    return this.buildSnapshot();
  }

  /** Full, uncapped daily history — including today's still-live counters — for the History view. */
  getFullHistory(): DailyRecord[] {
    const today: DailyRecord = {
      date: this.lastSessionDate || isoDate(new Date()),
      sessions: this.completedSessionsToday,
      focusMs: this.focusMsToday,
      breaksTaken: this.breaksTakenToday,
      breaksSkipped: this.breaksSkippedToday,
      tasksPlanned: this.planTasks.length || undefined,
      tasksDone: this.planTasks.filter(t => t.done).length || undefined,
    };
    return [...this.history, today];
  }

  private dispose(): void {
    if (this.intervalHandle !== undefined) {
      clearInterval(this.intervalHandle);
    }
    this.persistState();
  }
}
