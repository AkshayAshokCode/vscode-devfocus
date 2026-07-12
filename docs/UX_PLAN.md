# DevFocus UX Vision — from timer to pacing companion

> **Mission**: DevFocus is for engineers to manage their productivity, breaks, and
> work-life balance while working with AI to build great things.

## 1. The reframing: what "working with AI" changes

The Pomodoro technique (1987) assumed work was *continuous manual output* and the
problem was sustaining focus. AI-assisted engineering inverts the problem:

- **Work is a loop, not a stream** — prompt → wait (30s–10min) → review → prompt.
  The agent's cadence sets the rhythm, not yours.
- **Review fatigue is invisible.** Judging AI output is cognitively expensive but
  doesn't *feel* like work, so engineers under-count their fatigue.
- **Sessions no longer have natural ends.** "One more prompt" feels free — the agent
  does the typing. The AI era's productivity risk isn't distraction; it's **never
  disengaging**.
- **Wait periods are unstructured downtime** that nobody uses well.

**Product thesis:** DevFocus is the pacing layer for AI-era engineering — it protects
focus during work, turns agent-wait time into recovery, and gives the day a
defensible end.

## 2. Design principles

1. **Ambient over interruptive** — the status bar is the primary surface; the panel
   is glanced at, not lived in. Never steal focus mid-flow.
2. **One state, one screen** — the panel shows only what the current moment needs.
3. **Nudge, never guilt** — copy celebrates disengaging as much as output.
4. **Local and private** — all history stays in `globalState`. No accounts, no telemetry.
5. **Native feel** — VS Code theme tokens everywhere.

## 3. The experience as a day arc

| Moment | Experience |
|---|---|
| First run | 1-question inline setup: pick your rhythm (Classic / Deep Work / Custom) |
| Starting | Intent line ("What are you working on?") promoted to top; echoed in status bar |
| During work | Minimal Focus screen: intent, arc, time, dots. Everything else hidden |
| Break | Distinct Break screen leading with a micro-activity suggestion; skip has gentle friction |
| Round done | Small celebratory summary |
| Wind-down | After a configured hour, product changes posture: day summary, "Close the day" |
| Next morning | One-line yesterday recap + weekly rhythm strip |

## 4. Roadmap

### Phase 1 — State-driven panel redesign ✅ (shipped in this branch)
- Four screens driven by `TimerSnapshot`: **Setup (first-run) · Idle · Focus · Break**
  (`firstRun` flag added to the snapshot).
- Custom timings collapsed behind a "Customize" disclosure on the Idle screen.
- Intent line promoted; shown inline in the status bar while running.
- Break screen with its own heading, phase-colored, plus a rotating gentle suggestion.
- Notification copy pass to the "nudge, never guilt" voice.

### Phase 2 — The balance layer ✅ (shipped in this branch)
- Persisted per-day: `breaksSkippedToday`, `focusMsToday` (reset at midnight).
- Break suggestions: local rotating list, separate pools for short and long breaks.
- Skip-break counter + friction copy shown next to the Skip button.
- Wind-down mode: after `windDownTime` the status bar shows a wind-down state and the idle panel
  leads with a day summary (sessions vs goal, focus time, breaks skipped).
- New settings: `devfocus.dailyGoal` (default 8, 0 disables),
  `devfocus.windDownTime` (default 18:00, empty disables).
- "Daily goal reached" notification takes precedence over the generic milestone.

### Phase 3 — Insight ✅ (shipped in this branch)
- Rolling 30-day history: `{date, sessions, focusMs, breaksTaken, breaksSkipped}`,
  archived at midnight (checked every tick, so it works even if the editor sits open).
- 7-day rhythm strip on the idle screen with per-day tooltips; today highlighted.
- ~~Streaks~~ — shipped, then deliberately removed: a streak is a loss-aversion
  mechanic that punishes rest, contradicting the mission. Replaced by the weekly
  focus total next to the rhythm strip (a fact, not a chain).

### Phase 4 — AI-aware features ✅ (shipped in this branch)
- ~~"Waiting on AI" micro-breaks + agent hooks~~ — shipped, then removed: the
  quick action required a manual keystroke on every agent wait (30–80/day for a
  typical AI-assisted session), failing the basic habit test the same way
  streaks did. Worse, freezing the timer meant `focusMsToday` shrank on
  heavy-agent-usage days — directly undermining the product's own thesis that
  agent-wait time is real, countable work. One tip line from its break copy
  survives in the regular break rotation; the chip, `Alt+Shift+M`, the URI
  scheme, and `devfocus.microBreakMinutes` are gone.

### Phase 5 — The Plan moment ✅ (shipped in this branch)
- **Today list** (max 5): the intent line grown into a list; active task = intent,
  feeds status bar and focus screen; sessions attribute per task; done tasks stay
  struck-through all day, become counts in history at midnight.
- **Later tray** (cap 10 manual adds): capture, promote/demote between lists, stale
  fade after 7 days with "clear old"; unfinished Today tasks roll into it nightly.
- **Capture command**: `DevFocus: Add to Later` (`alt+shift+a`) via the native
  input box — zero panel real estate, works mid-focus.
- **Wind-down triage**: one-click "Move N open tasks to Later" in the day summary.
- **Reorder + rename** (added post-launch): chevrons reorder within Today
  (priority isn't fixed at write-time); a pencil renames any task in place.
  Icon language split cleanly — chevrons move *within* a list, arrows move
  *between* lists — so the two never collide visually.
- Full behavior spec in [UX_DESIGN.md](UX_DESIGN.md) §8.4b; visuals in
  [UI_SPEC.md](UI_SPEC.md) §5.7. Drag-and-drop deferred (click-first per spec).

## 5. Non-goals

- No accounts, sync, or cloud — privacy-local is the brand.
- No website blockers or focus "enforcement".
- No dashboard-heavy analytics — one rhythm strip, not Grafana.
- No automatic AI-activity detection via private APIs — tried as an explicit
  hook/button instead (§4, Phase 4), then removed when the mechanic itself
  didn't hold up; not revisited as a background/automatic version either.
