import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { DailyRecord } from './types';

/** A read-only, full-history calendar view — opened from the rhythm strip's "View all" link. */
export class HistoryPanel {
  private static current: HistoryPanel | undefined;

  static createOrShow(context: vscode.ExtensionContext, history: DailyRecord[]): void {
    if (HistoryPanel.current) {
      HistoryPanel.current.panel.reveal(vscode.ViewColumn.Active);
      HistoryPanel.current.render(history);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'devfocus.history',
      'DevFocus History',
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview')],
      },
    );
    HistoryPanel.current = new HistoryPanel(panel, context, history);
  }

  private constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext,
    history: DailyRecord[],
  ) {
    this.render(history);
    this.panel.onDidDispose(() => {
      HistoryPanel.current = undefined;
    });
  }

  private render(history: DailyRecord[]): void {
    const webview = this.panel.webview;
    const nonce = crypto.randomBytes(16).toString('hex');
    const extensionUri = this.context.extensionUri;

    const cssUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'history.css'),
    );
    const jsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'history.js'),
    );

    const htmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'history.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    html = html
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{cssUri\}\}/g, cssUri.toString())
      .replace(/\{\{jsUri\}\}/g, jsUri.toString())
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace('{{historyJson}}', () => JSON.stringify(history));

    webview.html = html;
  }
}
