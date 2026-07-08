# DevFocus

[![VS Code Marketplace Version](https://vsmarketplacebadges.dev/version-short/akshayashokcode.devfocus.png)](https://marketplace.visualstudio.com/items?itemName=akshayashokcode.devfocus)
[![Open VSX Version](https://img.shields.io/open-vsx/v/akshayashokcode/devfocus?label=Open%20VSX&logo=eclipseide)](https://open-vsx.org/extension/akshayashokcode/devfocus)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/akshayashokcode/devfocus?label=Cursor%20Downloads)](https://open-vsx.org/extension/akshayashokcode/devfocus)

A Pomodoro timer built for developers, living right inside VSCode and Cursor.

## Screenshots

| Timer running | Break phase | Status bar |
|---|---|---|
| ![Timer running](images/screenshot-work.png) | ![Break phase](images/screenshot-break.png) | ![Status bar](images/screenshot-statusbar.png) |

## Features

- **Three modes** — Classic (25/5 min), Deep Work (50/10 min), and fully Custom
- **Circular progress arc** — smooth visual countdown with phase-colour transitions
- **Task label** — name what you're working on; shown in the status bar tooltip
- **Sound toggle** — mute/unmute with one click directly in the panel
- **Pause indicator** — dimmed arc and "Paused" badge make state unambiguous
- **Session dots** — at-a-glance round progress with colour-coded states
- **Status bar** — live time and phase always visible without opening the sidebar
- **Milestone notifications** — celebration at every 5 completed sessions today
- **Day plan** — write 3–5 tasks for today; the active one becomes your intent in the status bar, and sessions count against it automatically
- **Later tray** — capture stray thoughts with `Alt+Shift+A` without leaving your code; promote them to today when their time comes
- **"Waiting on AI" micro-breaks** — one keystroke starts a short rest while your agent works; the session freezes and resumes where it was
- **Daily goal & wind-down** — set a session goal and a wind-down hour; after it, DevFocus nudges you to wrap up with a day summary
- **Weekly rhythm** — a 7-day strip of your focus history with the week's focus total, kept locally for 30 days
- **Persistent state** — timer survives VSCode restarts, restored as paused
- **Auto-start** — optionally starts the next work session automatically after a break
- **Keyboard shortcuts** — start/pause, reset, and skip break without touching the mouse

## Getting Started

1. Install DevFocus from the VSCode Marketplace
2. Click the DevFocus icon in the Activity Bar to open the panel
3. Select a mode, type what you're working on, and press **Start**

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Start / Pause | `Alt+Shift+D` |
| Skip Break | `Alt+Shift+B` |
| Micro-break ("Waiting on AI") | `Alt+Shift+M` |
| Capture a task to Later | `Alt+Shift+A` |

Reset has no default shortcut (it's destructive and rare) — run `DevFocus: Reset Timer` from the Command Palette, or bind your own key.

## Modes

| Mode | Session | Short Break | Long Break |
|---|---|---|---|
| Classic | 25 min | 5 min | 15 min |
| Deep Work | 50 min | 10 min | 30 min |
| Custom | your choice | your choice | your choice |

## Settings

| Setting | Default | Description |
|---|---|---|
| `devfocus.soundEnabled` | `true` | Play audio on phase transitions |
| `devfocus.autoStartNextSession` | `true` | Auto-start work session after break |
| `devfocus.notificationsEnabled` | `true` | Show desktop notifications |
| `devfocus.defaultMode` | `"CLASSIC"` | Mode applied on first launch |
| `devfocus.longBreakMinutes` | `15` | Default long break length for Custom mode |
| `devfocus.dailyGoal` | `8` | Daily session goal shown in panel and status bar (0 disables) |
| `devfocus.windDownTime` | `"18:00"` | After this hour DevFocus nudges you to wrap up (empty disables) |
| `devfocus.microBreakMinutes` | `3` | Auto-resume cap for the open-ended micro-break |

## Working with AI agents

AI-assisted coding is a loop: prompt → wait → review. DevFocus turns the wait into recovery.

**Micro-breaks** — while an agent works, press `Alt+Shift+M` (or click **Waiting on AI** in the panel). Your session freezes and an open-ended rest counts up — agent waits end unpredictably, so there's no duration to guess. Click **I'm back** when the agent's done (or let the `agent-done` hook do it), and everything resumes exactly where it was; a cap (default 3 min) auto-resumes forgotten breaks.

**Agent hooks** — external tools can drive DevFocus through URIs:

| URI | Effect |
|---|---|
| `vscode://akshayashokcode.devfocus/micro-break` | Toggle a micro-break |
| `vscode://akshayashokcode.devfocus/agent-start` | Suggest a micro-break (notification with one-click action) |
| `vscode://akshayashokcode.devfocus/agent-done` | End the micro-break if one is running |

For example, [Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) can nudge you to rest while Claude works and call you back when it finishes — add to `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "open 'vscode://akshayashokcode.devfocus/agent-start'" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "open 'vscode://akshayashokcode.devfocus/agent-done'" }] }
    ]
  }
}
```

Use `xdg-open` on Linux or `start ""` on Windows instead of `open`. In Cursor, replace the `vscode://` scheme with `cursor://`.

## Cursor IDE

DevFocus is fully compatible with [Cursor](https://cursor.sh). It uses only standard VSCode extension APIs.

## License

MIT © [akshayashokcode](https://github.com/AkshayAshokCode)
