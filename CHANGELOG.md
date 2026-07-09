# Changelog

## [1.2.2] - 2026-07-08

### Fixed
- Sound cues never played unless the DevFocus panel had been opened at least once — playback lived entirely in the webview (extensions can't play audio directly), so `postPlaySound` silently no-op'd for anyone running status-bar-first, which is the product's primary intended workflow. Sound now plays from the extension host via the OS's native player (`afplay`/PowerShell `SoundPlayer`/`paplay`), independent of whether the panel has ever been opened

### Added
- Mark the active task done without stopping the timer — a check-circle sits next to the intent on the focus screen (also `DevFocus: Complete Active Task` in the Command Palette); the next open task becomes the intent and the session keeps running
- Pausing now reveals the day plan, so switching tasks mid-round never requires ending the session

### Changed
- Removed the blinking timer colon — the ticking seconds already signal "running", and a 1 Hz blink fights the panel's ambient design (it also made every screenshot look broken)

### Fixed
- Focus arc, session segments, and rhythm bars were nearly invisible on Cursor's default themes — the signal color used `focusBorder`, which Cursor Dark defines at 15% alpha (and Cursor Dark Midnight as fully transparent); the signal now uses `progressBar.background`, which every theme must keep visible

## [1.2.1] - 2026-07-08

### Fixed
- Activity Bar icon rendered as a solid square — VS Code uses that icon as a mask, so the full-color PNG collapsed into a blob; replaced with a monochrome SVG of the brand ring (the marketplace tile keeps the PNG)
- Codicon icons now render in the installed extension — the icon font was loaded from `node_modules`, which is never included in the packaged `.vsix`; it is now vendored into the webview assets

### Added
- Day plan — write up to 5 tasks for today on the idle screen; the active task becomes your intent (status bar + focus screen), sessions attribute to it automatically, and completed tasks stay visibly struck through until midnight, when they fold into history as counts
- Later tray — capture stray thoughts (`Alt+Shift+A` from anywhere via the native input box, cap 10), promote to today with one click, demote back just as easily; unfinished tasks roll into Later at midnight; items older than a week fade with a "clear old" affordance
- Wind-down triage — one click moves all open tasks to Later so closing the day is honest
- "Waiting on AI" micro-breaks — `Alt+Shift+M`, the button on the focus screen, or the `DevFocus: Micro-Break` command freezes the session for an open-ended rest that counts up (agent waits end unpredictably) and auto-resumes at a cap (`devfocus.microBreakMinutes`, default 3); "I'm back" or the agent-done hook ends it sooner
- Agent integration URIs — `vscode://akshayashokcode.devfocus/{micro-break|agent-start|agent-done}` let AI tool hooks (e.g. Claude Code) suggest a rest when an agent starts and call you back when it finishes
- Session history — daily records (sessions, focus time, breaks taken/skipped) kept locally for the last 30 days, archived automatically at midnight
- Weekly rhythm strip — a 7-day bar chart on the idle screen with per-day tooltips
- Weekly focus total shown next to the rhythm strip (streaks were considered and rejected — loss-aversion mechanics punish rest)
- Daily session goal (`devfocus.dailyGoal`, default 8) — progress shown as `3/8 today` in the status bar and panel, with a "Daily goal reached" notification
- Wind-down mode (`devfocus.windDownTime`, default 18:00) — after this hour the status bar shows a wind-down state and the idle panel leads with a day summary (sessions, focus time, breaks skipped)
- Focus time tracking — total focused minutes per day, shown in the day summary and status bar tooltip
- Skip-break friction — skipped breaks are counted and gently surfaced next to the Skip button ("2 breaks skipped today — try to honor this one")

### Changed
- Start/Pause keybinding moved from `Alt+Shift+F` to `Alt+Shift+D` — `Alt+Shift+F` is VS Code's Format Document; Reset lost its default binding (`Alt+Shift+R` collides with Reveal in Explorer, and destructive + rare warrants Command Palette only)
- Idle screen decluttered: the info line shows today's focus time instead of duplicating the mode; the in-arc session counter and idle FOCUS label are gone (the segments carry round progress, now with tooltips); the wind-down summary no longer appears on an empty day
- Visual rebrand — pomodoro iconography retired: no tomato, no emoji anywhere; monochrome instrument style with the theme's own accent as the single signal color, thin timer numerals, session segments instead of dots, and circle-codicon status bar states (filled = focus, outline = recovery)
- Notifications are now single terse sentences (VS Code toasts render one line)
- Panel redesigned around four state-driven screens: **Setup** (first run), **Idle**, **Focus**, and **Break** — each moment shows only what it needs (see `docs/UX_PLAN.md`)
- First-run setup screen: pick your rhythm (Classic / Deep Work / Custom) with one click
- Custom timings moved behind a "Customize timings" disclosure on the Idle screen
- Intent line ("What are you working on?") promoted on the Focus screen and shown inline in the status bar while a session runs
- Break screen now leads with a phase-coloured heading and a rotating gentle suggestion (stretch, eyes, water)
- Session dots now mark the just-finished session as done during its break
- Start button reads "Resume" when paused; Reset hidden when there is nothing to reset
- Notification copy pass — calmer, break-honoring tone ("nudge, never guilt")

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
