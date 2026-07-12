import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { TimerService } from './TimerService';
import { TimerSnapshot, WebToExtMsg } from './types';

export class WebViewPanel implements vscode.WebviewViewProvider {
  public static readonly viewId = 'devfocus.panel';

  private view?: vscode.WebviewView;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly timerService: TimerService,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _ctx: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    this.view = webviewView;

    const webview = webviewView.webview;
    const extensionUri = this.context.extensionUri;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'src', 'webview')],
    };

    webview.html = this.buildHtml(webview, extensionUri);

    webview.onDidReceiveMessage((msg: WebToExtMsg) => {
      switch (msg.type) {
        case 'start':        this.timerService.start();   break;
        case 'pause':        this.timerService.pause();   break;
        case 'reset':        this.timerService.reset();   break;
        case 'skipBreak':    this.timerService.skipBreak(); break;
        case 'toggleSound':  this.timerService.toggleSound(); break;
        case 'setTask':      this.timerService.setTask(msg.label); break;
        case 'addTask':      this.timerService.addTask(msg.label); break;
        case 'editTask':     this.timerService.editTask(msg.id, msg.label); break;
        case 'reorderTask':  this.timerService.reorderTask(msg.id, msg.direction); break;
        case 'toggleTaskDone': this.timerService.toggleTaskDone(msg.id); break;
        case 'setActiveTask':  this.timerService.setActiveTask(msg.id); break;
        case 'demoteTask':     this.timerService.demoteTask(msg.id); break;
        case 'promoteTask':    this.timerService.promoteTask(msg.id); break;
        case 'deleteLaterTask': this.timerService.deleteLaterTask(msg.id); break;
        case 'clearOldLater':  this.timerService.clearOldLater(); break;
        case 'triageOpenTasks': this.timerService.triageOpenTasks(); break;
        case 'applyMode':    this.timerService.applyMode(msg.mode); break;
        case 'applyCustomSettings':
          this.timerService.applyCustomSettings(
            msg.sessionMinutes,
            msg.breakMinutes,
            msg.sessionsPerRound,
            msg.longBreakMinutes,
          );
          break;
        case 'openSettings':
          vscode.commands.executeCommand('workbench.action.openSettings', 'devfocus');
          break;
      }
    });

    // Re-send current snapshot when panel becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.postSnapshot(this.timerService.getSnapshot());
      }
    });

    // Send initial snapshot
    this.postSnapshot(this.timerService.getSnapshot());
  }

  postSnapshot(snap: TimerSnapshot): void {
    this.view?.webview.postMessage({ type: 'timerUpdate', payload: snap });
  }

  private buildHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const nonce = crypto.randomBytes(16).toString('hex');

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'panel.css'),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'panel.js'),
    );
    // Vendored copy — devDependencies never ship in the .vsix
    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'codicons', 'codicon.css'),
    );

    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'panel.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cssUri\}\}/g, cssUri.toString())
      .replace(/\{\{jsUri\}\}/g, jsUri.toString())
      .replace(/\{\{codiconsUri\}\}/g, codiconsUri.toString())
      .replace(/\{\{cspSource\}\}/g, webview.cspSource);

    return html;
  }
}
