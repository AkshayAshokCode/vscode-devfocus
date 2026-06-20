import * as vscode from 'vscode';
import { TimerSnapshot, TimerState, TimerPhase } from './types';

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

    switch (state) {
      case TimerState.IDLE: {
        const label = dailyCount > 0 ? `🍅 ${dailyCount} today` : '🍅 DevFocus';
        this.item.text = label;
        this.item.tooltip = this.buildIdleTooltip(snap);
        break;
      }
      case TimerState.RUNNING: {
        const icon = phase === TimerPhase.WORK
          ? '$(watch)'
          : phase === TimerPhase.BREAK
            ? '$(coffee)'
            : '$(star)';
        const phaseLabel = phase === TimerPhase.WORK
          ? `Session ${currentSession}/${settings.sessionsPerRound}`
          : phase === TimerPhase.BREAK
            ? 'Break'
            : 'Long Break';
        this.item.text = `${icon} ${timeDisplay} | ${phaseLabel}`;
        this.item.tooltip = taskLabel ? `🎯 ${taskLabel}` : undefined;
        break;
      }
      case TimerState.PAUSED: {
        const icon = phase === TimerPhase.WORK
          ? '$(watch)'
          : phase === TimerPhase.BREAK
            ? '$(coffee)'
            : '$(star)';
        const phaseLabel = phase === TimerPhase.WORK
          ? `Session ${currentSession}/${settings.sessionsPerRound}`
          : phase === TimerPhase.BREAK
            ? 'Break'
            : 'Long Break';
        this.item.text = `${icon} ${timeDisplay} | ${phaseLabel} $(debug-pause)`;
        const pausedLine = 'Paused — click to open DevFocus';
        this.item.tooltip = taskLabel ? `🎯 ${taskLabel}\n${pausedLine}` : pausedLine;
        break;
      }
    }
  }

  private buildIdleTooltip(snap: TimerSnapshot): string {
    const { settings, dailyCount, taskLabel } = snap;
    const lines = [
      `Mode: ${settings.mode}`,
      `Session: ${settings.sessionMinutes}m / Break: ${settings.breakMinutes}m`,
      `Sessions per round: ${settings.sessionsPerRound}`,
      `Completed today: ${dailyCount}`,
    ];
    if (taskLabel) {
      lines.unshift(`🎯 ${taskLabel}`, '');
    }
    lines.push('', 'Click to open DevFocus panel');
    return lines.join('\n');
  }
}
