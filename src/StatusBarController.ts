import * as vscode from 'vscode';
import { TimerSnapshot, TimerState, TimerPhase } from './types';

const TASK_MAX_CHARS = 24;

export class StatusBarController {
  private readonly item: vscode.StatusBarItem;

  constructor(context: vscode.ExtensionContext) {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'devfocus.openPanel';
    this.item.show();
    context.subscriptions.push(this.item);
  }

  update(snap: TimerSnapshot): void {
    const { state, phase, timeDisplay, currentSession, settings, dailyCount, taskLabel } = snap;

    if (snap.microBreakActive) {
      this.item.text = `$(circle-outline) ${timeDisplay} · Micro-break`;
      this.item.tooltip = 'Micro-break — resting while the agent works\nClick to open DevFocus';
      return;
    }

    // Circle family: filled = focus, outline = recovery, large-outline = standing by
    const icon = phase === TimerPhase.WORK ? '$(circle-filled)' : '$(circle-outline)';
    const phaseLabel = phase === TimerPhase.WORK
      ? `S${currentSession}/${settings.sessionsPerRound}`
      : phase === TimerPhase.BREAK
        ? 'Break'
        : 'Long break';

    switch (state) {
      case TimerState.IDLE: {
        const countPart = snap.dailyGoal > 0
          ? `${dailyCount}/${snap.dailyGoal}`
          : `${dailyCount}`;
        const suffix = snap.windDown ? `${countPart} · wind down` : `${countPart} today`;
        this.item.text = dailyCount > 0
          ? `$(circle-large-outline) ${suffix}`
          : '$(circle-large-outline) DevFocus';
        this.item.tooltip = this.buildIdleTooltip(snap);
        break;
      }
      case TimerState.RUNNING: {
        // During focus, the intent is the most useful thing to glance at
        const suffix = phase === TimerPhase.WORK && taskLabel
          ? `· ${this.truncate(taskLabel)}`
          : `· ${phaseLabel}`;
        this.item.text = `${icon} ${timeDisplay} ${suffix}`;
        this.item.tooltip = this.buildRunningTooltip(phaseLabel, taskLabel);
        break;
      }
      case TimerState.PAUSED: {
        const suffix = phase === TimerPhase.WORK && taskLabel
          ? `· ${this.truncate(taskLabel)}`
          : `· ${phaseLabel}`;
        this.item.text = `${icon} ${timeDisplay} ${suffix} $(debug-pause)`;
        const pausedLine = 'Paused — click to open DevFocus';
        this.item.tooltip = taskLabel
          ? `Intent: ${taskLabel}\n${phaseLabel}\n${pausedLine}`
          : `${phaseLabel}\n${pausedLine}`;
        break;
      }
    }
  }

  private truncate(label: string): string {
    return label.length > TASK_MAX_CHARS
      ? `${label.slice(0, TASK_MAX_CHARS - 1).trimEnd()}…`
      : label;
  }

  private buildRunningTooltip(phaseLabel: string, taskLabel: string): string {
    const lines = [`${phaseLabel} — click to open DevFocus`];
    if (taskLabel) {
      lines.unshift(`Intent: ${taskLabel}`);
    }
    return lines.join('\n');
  }

  private buildIdleTooltip(snap: TimerSnapshot): string {
    const { settings, dailyCount, dailyGoal, focusMsToday, taskLabel, windDown } = snap;
    const completedLine = dailyGoal > 0
      ? `Completed today: ${dailyCount} of ${dailyGoal}`
      : `Completed today: ${dailyCount}`;
    const lines = [
      `Mode: ${settings.mode}`,
      `Session: ${settings.sessionMinutes}m / Break: ${settings.breakMinutes}m`,
      `Sessions per round: ${settings.sessionsPerRound}`,
      completedLine,
      `Focus time today: ${this.formatFocus(focusMsToday)}`,
    ];
    if (windDown) {
      lines.unshift('Wind-down — consider closing the day', '');
    }
    if (taskLabel) {
      lines.unshift(`Intent: ${taskLabel}`, '');
    }
    lines.push('', 'Click to open DevFocus panel');
    return lines.join('\n');
  }

  private formatFocus(ms: number): string {
    const totalMin = Math.floor(ms / 60000);
    if (totalMin < 60) return `${totalMin}m`;
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
  }
}
