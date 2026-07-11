# DevFocus — UX Design Specification

> Companion to [UX_PLAN.md](UX_PLAN.md) (strategy & roadmap). This document is the
> *design system*: who we design for, what each surface is allowed to do, and the
> exact rules every element must follow. When code and this spec disagree, one of
> them is wrong on purpose — decide which, then fix it.

---

## 1. Product definition

**DevFocus is a pacing instrument, not an app.** The user's primary task is code;
DevFocus succeeds when it is *barely noticed but always trusted*. It answers three
jobs, in priority order:

1. **Help me start** — turn a vague intention into a committed block of focus.
2. **Help me stop** — end sessions, honor breaks, end the day. In the AI-agent era
   this is the harder and more valuable job: agents remove the natural stopping
   points, so the tool must supply them.
3. **Show me I'm sustainable** — lightweight evidence of rhythm, never surveillance.

**Audience**: professional engineers in VS Code/Cursor 4–8 h/day, keyboard-first,
theme-sensitive, allergic to gamification and to anything that competes with the
code for attention. Increasingly working in a prompt → wait → review loop with AI
agents.

---

## 2. The IDE context (hard constraints)

- **The sidebar is contested real estate.** Users visit it a few times a day, for
  seconds. It must never be *required* for routine operation.
- **The status bar is the only persistent surface.** ~20–40 characters. The whole
  product must be legible there.
- **Keyboard-first.** Every routine action needs a command; mouse is the fallback.
- **Never steal default keybindings.** (See §9 — we currently do.)
- **Themes are infinite.** Only VS Code theme tokens; no hard-coded colors except
  as token fallbacks.
- **Panel width is 220–400 px** normally, but can be dragged wide or into the
  bottom panel. Content column caps at 380 px; compact mode below 160 px.

---

## 3. Surface hierarchy — the attention budget

Design effort and information placement follow glance frequency:

| Rank | Surface | Frequency | Job | Budget |
|---|---|---|---|---|
| 1 | Status bar | dozens/hour | monitor without thinking | ≤ 30 chars, 1 glance |
| 2 | Notifications | ~6–10/day | mark transitions | 1 sentence, 1 optional action |
| 3 | Sidebar panel | ~3–5/day | decide (start / recover / reflect) | 1 screen per moment |
| 4 | Settings | once | set the contract | plain language |

**Rule A** — nothing needed mid-flow may live only in the panel.
**Rule B** — the panel must never be needed to operate the timer (status bar +
commands suffice).
**Rule C** — each element answers exactly one question; if two elements answer the
same question on one screen, one of them dies.

---

## 4. The moment model

The panel is not a dashboard; it is six moments, each with one question and one
primary action. `screenFor()` in the webview is the runtime expression of this table.

| Moment | Screen | The one question | Primary action | Everything else |
|---|---|---|---|---|
| Arrive (first run) | Setup | "What is this?" | pick a rhythm | hidden |
| Plan (morning) | Idle | "What matters today?" | write 3–5 tasks, pull from Later | mode chip beside it |
| Commit | Idle | "What am I about to do?" | pick active task → Start | today line, rhythm strip |
| Flow | Focus | "How much is left?" | (none — keep going) | Pause, micro-break, quiet |
| Recover | Break / Micro | "What should I do *right now*?" | rest (do nothing) | skip (dissuaded), I'm back |
| Wrap | Idle + wind-down | "Have I done enough?" | close the day | one more session (allowed, quiet) |
| Reflect | Idle (morning) | "Am I sustainable?" | (none) | rhythm strip, weekly total |

---

## 5. Vocabulary (one word per concept, everywhere)

Copy, UI labels, settings descriptions, README and notifications all use the same
terms. Never mix.

| Concept | The word | Never say |
|---|---|---|
| The activity | **focus** | work, grinding |
| One counted block | **session** | pomodoro, sprint |
| Short recovery | **break** | pause, rest (as noun) |
| End-of-round recovery | **long break** | big break |
| Agent-wait recovery | **micro-break** | mini break, AI break |
| A set of sessions | **round** | cycle, set |
| The task label | **intent** | task, label |
| A planned item for today | **task** | todo, ticket, item |
| Today's task list | **plan** | backlog, board |
| The someday tray | **Later** | backlog, inbox |
| Grabbing a stray thought | **capture** | quick add |
| Daily target | **goal** | quota, target |
| Evening boundary | **wind-down** | overtime, cutoff |

---

## 6. Color & iconography — monochrome + one signal

The palette is two channels (full spec in [UI_SPEC.md](UI_SPEC.md) §4):

| Channel | Token | Meaning |
|---|---|---|
| **Signal** | `--vscode-progressBar-background` (the theme's own progress color) | focus is live: focus arc, done segments, rhythm bars |
| Ink ramp | `foreground` / `descriptionForeground` / `widget-border` | everything else; recovery states are ink at reduced intensity (break 0.55, long break 0.35, paused 0.5) |

State is encoded in **fill vs outline and intensity, not hue**. DevFocus has no
color of its own — it inherits each theme's accent.

**Iconography**: geometry only. Status bar uses the codicon circle family
(filled = focus, outline = recovery, large-outline = standing by) plus
`$(debug-pause)`. The wordmark is an inline SVG ring. **No emoji anywhere** —
the 🍅 🌙 🤖 🔥 ☕ set is deleted, not replaced. Session progress renders as
segment tick-marks (done = signal, current = signal @ 0.45, pending = track).

---

## 7. Voice & copy

Tone: a calm senior colleague. Celebrates disengaging as much as output. Never
guilt, never exclamation-mark cheerleading, never corporate wellness.

**Notifications are one sentence.** VS Code toasts render a single line —
`title\nbody` concatenation is a bug, not a style. Plain text, no emoji,
optional single action button. Terse, precise, still humane.

| Event | Copy |
|---|---|
| Session done | `Session 2 done — take 5 minutes away from the screen.` |
| Round done | `Round complete — step away for 15 minutes.` |
| Break over (auto) | `Session 3 of 4 starting.` |
| Break over (manual) | `Session 3 is ready when you are.` [Start session] |
| Goal reached | `Goal met — 8 sessions. Everything from here is bonus.` |
| Milestone | `5 sessions today. Make the next break a real one.` |
| Micro-break over | `Micro-break over — resuming.` |
| Agent working | `Agent's working — rest your eyes?` [Micro-break] |

---

## 8. Surface specifications

### 8.1 Status bar (the primary surface)

Codicon circle family — filled = focus, outline = recovery, large-outline =
standing by:

| State | Text | Tooltip leads with |
|---|---|---|
| Idle, fresh | `$(circle-large-outline) DevFocus` | mode + how to start |
| Idle, active day | `$(circle-large-outline) 3/8 today` | intent, goal, focus time |
| Idle, wind-down | `$(circle-large-outline) 6/8 · wind down` | "consider closing the day" |
| Focus, with intent | `$(circle-filled) 24:59 · fixing auth` | intent, session x/y |
| Focus, no intent | `$(circle-filled) 24:59 · S2/4` | — |
| Paused | previous + `$(debug-pause)` | "paused" |
| Break | `$(circle-outline) 04:12 · Break` | suggestion |
| Long break | `$(circle-outline) 12:40 · Long break` | — |
| Micro-break | `$(circle-outline) 02:45 · Micro-break` | "resting while the agent works" |

### 8.2 Panel — Idle (Commit / Reflect / Wrap)

Composition, top to bottom. Mode selection is a *rare* action and is demoted from
the prime top slot; **today** takes its place:

1. **Today line** — `3/8 sessions · 1h 20m` (left) · sound + settings icons (right).
   This is the panel's header. If no activity yet: `Ready when you are.`
2. **Intent input** — full width. The single most valuable pre-commitment ritual.
3. **Arc** — shows the full session length (the contract). Center: time only.
   No "FOCUS" label while idle — the user is not focusing yet, and the label
   would be a small lie.
4. **Session dots** — round progress (see §6 for states). Dot tooltips carry the
   precise "session 2 of 4"; the in-arc counter text is removed (Rule C: dots
   already answer it).
5. **Start** (primary). Reset appears only when there is something to reset.
6. **Mode chip** — quiet, footer-level: `Deep Work ⌄`. Opens the mode menu
   (Classic / Deep Work / Custom → timings form). The 50m/10m detail lives in the
   chip's tooltip and in the arc itself — not printed as a permanent line.
7. **Rhythm strip** — last 7 days + weekly focus total (`11h 20m this week`).
   A fact, not a chain: rest days can't break it. Hidden until data exists.

**Wind-down variant**: today line is replaced by the day-summary card
(🌙 Winding down · sessions vs goal · focus time · breaks skipped) and Start drops
to secondary emphasis. One more session is allowed — quietly.

### 8.3 Panel — Focus (Flow)

Minimal by law: intent (borderless, centered, editable, with a **check-circle to
mark the active task done mid-session** — the next open task slides in as the new
intent without touching the timer) · arc (time + FOCUS label) · segments · Pause +
Reset · `Waiting on AI` chip. No mode selector, no today line, no rhythm strip.
Nothing on this screen invites interaction except leaving it — or finishing.

**Paused is the re-planning moment**: the full plan block appears while paused, so
switching tasks mid-round never requires ending the session.

### 8.4 Panel — Break / Micro-break (Recover)

The **suggestion is the hero**, not the countdown: heading + suggestion above the
arc, phase-colored per §6. Skip Break is a *low-emphasis text button* (dissuade,
don't forbid) with the honest counter beneath ("2 breaks skipped today").

The micro-break is **open-ended**: agent waits end unpredictably, so it counts
*up* (`RESTING · 0:47`), never down — no duration to guess. The dial fills toward
the auto-resume cap (`microBreakMinutes`, default 3) so a forgotten break can't
eat the session; `agent-done` or **I'm back** (its only button) ends it sooner.

### 8.4b The day plan (Plan / Commit / Wrap)

The intent line, grown into a list. **The napkin, not the system**: it replaces the
morning notes-app ritual and nothing more.

- **Today**: max 5 tasks, strings only. The **active task is the intent** — it feeds
  the status bar and focus screen; editing the intent renames it. Completing a task
  advances active to the next open one. Done tasks stay visible all day — struck,
  dimmed, with their session tally (`S3`) — sunk below open tasks. Sessions
  attribute to the active task automatically.
- **Later**: a capture tray, cap 10 (manual adds only — demotion and rollover always
  succeed). Items are strings with an age; older than 7 days renders dimmed with a
  "clear old" affordance. Nothing auto-deletes. Collapsed by default, hidden when
  empty.
- **Movement between lists**: click-to-promote and click-to-demote, keyboard-reachable;
  demotion is triage, not failure — no confirmation, no red. A same-day round trip
  keeps the session tally.
- **Reordering within Today**: priority isn't fixed at write-time — a hover-revealed
  chevron pair moves a task up/down among the still-open tasks (done tasks always
  sink to the bottom regardless of storage order, so they're excluded from the
  ordering). Disabled at the top/bottom edge, same convention as a full Later tray.
- **Renaming**: a hover-revealed pencil turns the label into an input, in place —
  no dialog. Enter or clicking away saves; Escape reverts. Works on both Today and
  Later items. Typing is entirely local until commit, so it survives the once-a-second
  snapshot tick untouched (the plan only re-renders when the underlying data changes).
- **Icon language**: chevrons (↑/↓) move a task *within* its own list — priority
  order. Arrows (←/→) move a task *between* lists — Today ⇄ Later. The two never
  share a direction, so a hovered row never reads ambiguously.
- **Capture from anywhere**: `DevFocus: Add to Later` (`alt+shift+a`) opens the
  native input box — the intruding thought lands in Later without touching the
  panel or the focus screen.
- **Wind-down triage**: with open tasks after the wind-down hour, the day summary
  offers one-click bulk demotion ("Move 2 open tasks to Later").
- **Midnight**: done tasks fold into history as counts (`tasksPlanned`/`tasksDone`)
  and their text is gone — git is the archive of finished work. Unfinished tasks
  move to Later; session tallies don't cross days.
- **The plan lives on the idle and paused screens.** While running you see only
  the active task (completable in place); during breaks, nothing. No projects,
  priorities, dates, or sync — ever.

### 8.5 Setup (Arrive)

One decision: three rhythm cards. No goal/wind-down questions here — one decision
is the whole screen. Goal and wind-down introduce themselves contextually
(see §11, progressive onboarding).

---

## 9. Keyboard model

**Current bindings collide with VS Code defaults — this is a P0 defect.**
`Alt+Shift+F` is Format Document; `Alt+Shift+R` is Reveal in Explorer (Windows,
explorer focus). A focus tool that breaks formatting is self-sabotage.

| Command | Old | New default | Rationale |
|---|---|---|---|
| Start / Pause / I'm-back | `alt+shift+f` | `alt+shift+d` | D for DevFocus; unbound in stock VS Code |
| Micro-break | `alt+shift+m` | `alt+shift+m` (keep) | unbound in stock VS Code |
| Skip break | `alt+shift+b` | `alt+shift+b` (keep) | unbound in stock VS Code |
| Reset | `alt+shift+r` | *none* (palette only) | destructive + rare = no default binding |

Toggle is overloaded intentionally: during a micro-break it means "I'm back";
otherwise start/pause. One key, always "do the obvious thing".

---

## 10. Motion, sound, accessibility

- **Motion**: arc progress eases; phase change pulses once (disabled under
  `prefers-reduced-motion`). Nothing else moves — no blinking: the ticking
  seconds already signal "running".
- **Sound**: three cues, all < 1 s, soft attack (session end, break end, round
  complete). One-click mute in the panel, synced to settings. Trim `complete.wav`
  (currently 1.1 MB — most of the extension's download size).
- **Accessibility**: `role="timer"` with `aria-live="off"` (never announce every
  second); phase changes `aria-live="polite"`; dots are a list with per-dot labels;
  all controls reachable and labeled; color never the sole signal (dots also differ
  by fill/ring shape; arcs are paired with headings).

---

## 11. Progressive onboarding

Setup asks one question (rhythm). The rest of the contract introduces itself when
it becomes relevant, once each:

- After the **first completed session**: one notification — `🍅 Nice first session.
  Set a daily goal in Settings if you'd like a finish line.` [Open settings]
- The **first time wind-down triggers** with the panel open, the day-summary card
  carries a one-time caption: "This is wind-down — set your hour in Settings."

No tours, no modals, no coach marks.

---

## 12. Day boundaries

All "today" math (counters, history, rhythm labels, weekly totals) uses the **user's
local calendar day**, not UTC. A session at 11 pm belongs to the day the user
experienced. (Current build uses UTC — visible defect: the rhythm strip labels
"today" wrong for any timezone ahead of UTC.)

---

## 13. Non-goals (design)

No gamification. No streaks — loss-aversion mechanics punish rest, which is the
opposite of the mission; consistency is shown as facts (the rhythm strip, weekly
totals), never as chains to maintain. No red/warning states — this product has
no failure modes, only information. No badges, levels, confetti. No dashboard
pages. No sounds during focus. No modal dialogs, ever.

---

## 14. Delta backlog (spec vs current build)

**P0 — defects against this spec**
1. ✅ Rebind `alt+shift+f` → `alt+shift+d`; drop default binding for Reset (§9).
2. ✅ Notifications: single-sentence format (§7).
3. ✅ Color semantics — superseded by the instrument rebrand (§6): one signal,
   intensity for recovery, segments instead of dots.
4. ☐ Day boundaries → local time (§12).

**P1 — recomposition**
5. ◐ Idle screen: info line now shows today's facts instead of duplicating the
   mode; the full recomposition (mode as footer chip with menu, today line as
   header) is still open (§8.2).
6. ✅ Remove in-arc session counter text; segment tooltips added (§8.2).
7. ✅ Remove idle "FOCUS" arc label (§8.2).
8. ✅ Break screen: suggestion above arc; Skip demoted to text button (§8.4).

**P2 — refinement**
9. ☐ Progressive onboarding notifications (§11).
10. ✅ `prefers-reduced-motion` support (§10).
11. ☐ Trim audio assets (§10).
12. ☐ Wind-down: Start drops to secondary emphasis (§8.2).
