import * as vscode from 'vscode';
import { TimerService } from './TimerService';
import { StatusBarController } from './StatusBarController';
import { NotificationService } from './NotificationService';
import { SoundService } from './SoundService';
import { WebViewPanel } from './WebViewPanel';

export function activate(context: vscode.ExtensionContext): void {
  const notificationService = new NotificationService();
  const soundService = new SoundService(context);
  const timerService = new TimerService(context);
  const statusBar = new StatusBarController(context);
  const webViewPanel = new WebViewPanel(context, timerService);

  // Wire timer callbacks
  timerService.onSnapshot = snap => {
    statusBar.update(snap);
    webViewPanel.postSnapshot(snap);
  };

  // Sound plays from the extension host, not the webview — the status bar is
  // the primary surface, so playback must not depend on the panel ever having
  // been opened.
  timerService.onPlaySound = sound => {
    soundService.play(sound);
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
    vscode.commands.registerCommand('devfocus.microBreak', () => timerService.microBreak()),
    vscode.commands.registerCommand('devfocus.completeTask', () => timerService.completeActiveTask()),
    vscode.commands.registerCommand('devfocus.captureTask', async () => {
      const label = await vscode.window.showInputBox({
        prompt: 'Add to Later — a thought for another time',
        placeHolder: 'e.g. fix the flaky e2e test',
      });
      if (label && !timerService.captureLater(label)) {
        vscode.window.showInformationMessage('Later is full — clear something first.');
      }
    }),
    vscode.commands.registerCommand('devfocus.openPanel', () => {
      vscode.commands.executeCommand('devfocus-sidebar.focus');
    }),
  );

  // URI hooks so external tools (AI agent hooks, scripts) can drive DevFocus:
  //   vscode://akshayashokcode.devfocus/micro-break  — toggle a micro-break
  //   vscode://akshayashokcode.devfocus/agent-start  — agent began a long run; suggest a micro-break
  //   vscode://akshayashokcode.devfocus/agent-done   — agent finished; end the micro-break if one is running
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        switch (uri.path) {
          case '/micro-break':
            timerService.microBreak();
            break;
          case '/agent-start':
            notificationService.show(
              "Agent's working — rest your eyes?",
              '',
              'Micro-break',
              () => timerService.microBreak(),
            );
            break;
          case '/agent-done':
            timerService.endMicroBreakIfActive();
            break;
        }
      },
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
