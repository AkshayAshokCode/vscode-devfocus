# Changelog

## [1.0.0] - 2026-07-05

### Added
- Circular SVG progress arc with phase-colour transitions (work → break → long break)
- Three timer modes: Classic (25/5 min), Deep Work (50/10 min), and fully Custom
- Session dots showing round progress with colour-coded states
- Status bar integration — live time and phase always visible without opening the sidebar
- Sidebar panel with responsive layout (compact, vertical, horizontal) via ResizeObserver
- Task label — name what you're working on; shown in the status bar tooltip
- Sound toggle — mute/unmute directly in the panel; plays `work.wav`, `break.wav`, and `complete.wav` on phase transitions
- Desktop notifications at session and break end, with action buttons
- Milestone notification every 5 completed sessions
- Persistent state — timer survives VSCode/Cursor restarts, restored as paused with correct remaining time
- Daily session counter — resets at midnight, shown in status bar and panel
- Auto-start option — automatically starts the next work session after a break ends
- Long break after a configurable number of sessions (default: 4)
- Keyboard shortcuts: `Alt+Shift+F` (start/pause), `Alt+Shift+R` (reset), `Alt+Shift+B` (skip break)
- Commands: `DevFocus: Start / Pause Timer`, `DevFocus: Reset Timer`, `DevFocus: Skip Break`, `DevFocus: Open Panel`
- Settings: `soundEnabled`, `autoStartNextSession`, `notificationsEnabled`, `defaultMode`, `longBreakMinutes`
- Full compatibility with Cursor IDE
