import * as vscode from 'vscode';
import { TimerService } from './TimerService';
import { StatusBarController } from './StatusBarController';
import { NotificationService } from './NotificationService';
import { WebViewPanel } from './WebViewPanel';

export function activate(context: vscode.ExtensionContext): void {
  const notificationService = new NotificationService();
  const timerService = new TimerService(context);
  const statusBar = new StatusBarController(context);
  const webViewPanel = new WebViewPanel(context, timerService);

  // Wire timer callbacks
  timerService.onSnapshot = snap => {
    statusBar.update(snap);
    webViewPanel.postSnapshot(snap);
  };

  timerService.onPlaySound = sound => {
    webViewPanel.postPlaySound(sound);
  };

  timerService.onNotify = (title, body, actionText, actionCallback) => {
    // fire-and-forget so timer keeps running
    notificationService.show(title, body, actionText, actionCallback);
  };

  // Register sidebar panel
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(WebViewPanel.viewId, webViewPanel, {
      webviewOptions: { retainContextWhenHidden: true },
    }),
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('devfocus.toggle', () => timerService.toggle()),
    vscode.commands.registerCommand('devfocus.reset',  () => timerService.reset()),
    vscode.commands.registerCommand('devfocus.skipBreak', () => timerService.skipBreak()),
    vscode.commands.registerCommand('devfocus.openPanel', () => {
      vscode.commands.executeCommand('devfocus-sidebar.focus');
    }),
  );

  // Sync settings changes from VSCode config
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('devfocus')) {
        timerService.reloadVscodeSettings();
      }
    }),
  );
}

export function deactivate(): void {}
