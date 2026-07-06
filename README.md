# DevFocus

[![VS Code Marketplace](https://img.shields.io/visual-studio-marketplace/v/akshayashokcode.devfocus?label=VS%20Code%20Marketplace&logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=akshayashokcode.devfocus)
[![Open VSX](https://img.shields.io/open-vsx/v/akshayashokcode/devfocus?label=Open%20VSX%20%28Cursor%29&logo=eclipseide)](https://open-vsx.org/extension/akshayashokcode/devfocus)

A Pomodoro timer built for developers, living right inside VSCode and Cursor.

## Features

- **Three modes** — Classic (25/5 min), Deep Work (50/10 min), and fully Custom
- **Circular progress arc** — smooth visual countdown with phase-colour transitions
- **Task label** — name what you're working on; shown in the status bar tooltip
- **Sound toggle** — mute/unmute with one click directly in the panel
- **Pause indicator** — dimmed arc and "Paused" badge make state unambiguous
- **Session dots** — at-a-glance round progress with colour-coded states
- **Status bar** — live time and phase always visible without opening the sidebar
- **Milestone notifications** — celebration at every 5 completed sessions today
- **Persistent state** — timer survives VSCode restarts, restored as paused
- **Auto-start** — optionally starts the next work session automatically after a break
- **Keyboard shortcuts** — start/pause, reset, and skip break without touching the mouse

## Getting Started

1. Install DevFocus from the VSCode Marketplace
2. Click the tomato icon in the Activity Bar to open the panel
3. Select a mode, type what you're working on, and press **Start**

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Start / Pause | `Alt+Shift+F` |
| Reset | `Alt+Shift+R` |
| Skip Break | `Alt+Shift+B` |

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

## Cursor IDE

DevFocus is fully compatible with [Cursor](https://cursor.sh). It uses only standard VSCode extension APIs.

## License

MIT © [akshayashokcode](https://github.com/AkshayAshokCode)
