import * as vscode from 'vscode';

export class NotificationService {
  async show(
    title: string,
    body: string,
    actionText?: string,
    actionCallback?: () => void,
  ): Promise<void> {
    // Toasts render one line — never join with newlines
    const message = body ? `${title} ${body}` : title;
    const buttons: string[] = actionText ? [actionText] : [];
    const result = await vscode.window.showInformationMessage(message, ...buttons);
    if (result === actionText) {
      actionCallback?.();
    }
  }
}
