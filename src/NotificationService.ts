import * as vscode from 'vscode';

export class NotificationService {
  async show(
    title: string,
    body: string,
    actionText?: string,
    actionCallback?: () => void,
  ): Promise<void> {
    const message = `${title}\n${body}`;
    const buttons: string[] = actionText ? [actionText] : [];
    const result = await vscode.window.showInformationMessage(message, ...buttons);
    if (result === actionText) {
      actionCallback?.();
    }
  }
}
