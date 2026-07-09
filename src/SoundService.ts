import * as vscode from 'vscode';
import * as path from 'path';
import { execFile } from 'child_process';

export type SoundName = 'work' | 'break' | 'complete';

/**
 * Plays sound cues via the OS's native player. Runs in the extension host so
 * playback works whether or not the panel has ever been opened — sound must
 * not depend on the webview, since the status bar is the primary surface.
 */
export class SoundService {
  constructor(private readonly context: vscode.ExtensionContext) {}

  play(sound: SoundName): void {
    const file = path.join(this.context.extensionUri.fsPath, 'media', `${sound}.wav`);

    if (process.platform === 'darwin') {
      execFile('afplay', [file], () => {});
    } else if (process.platform === 'win32') {
      const script = `(New-Object Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync();`;
      execFile('powershell', ['-NoProfile', '-Command', script], () => {});
    } else {
      // Linux audio backends vary by distro — try the common ones, no-op if none exist
      this.tryLinuxPlayers(file, ['paplay', 'aplay', 'ffplay']);
    }
  }

  private tryLinuxPlayers(file: string, players: string[]): void {
    if (players.length === 0) return;
    const [bin, ...rest] = players;
    const args = bin === 'ffplay' ? ['-nodisp', '-autoexit', '-loglevel', 'quiet', file] : [file];
    execFile(bin, args, err => {
      if (err) this.tryLinuxPlayers(file, rest);
    });
  }
}
