import { execFile } from 'child_process';

// macOS adds this key to the console session only while the screen is locked
const LOCKED_PATTERN = /"CGSSessionScreenIsLocked"\s*=\s*Yes/;

/**
 * Reports whether the OS screen is locked. VS Code has no API for this, so on
 * macOS we read the console session flags from ioreg; other platforms report
 * "not locked" (a lid-close sleep is still caught by TimerService's tick-gap check).
 */
export function isScreenLocked(): Promise<boolean> {
  if (process.platform !== 'darwin') {
    return Promise.resolve(false);
  }
  return new Promise(resolve => {
    execFile('/usr/sbin/ioreg', ['-n', 'Root', '-d1'], { timeout: 3000 }, (err, stdout) => {
      resolve(!err && LOCKED_PATTERN.test(stdout));
    });
  });
}
