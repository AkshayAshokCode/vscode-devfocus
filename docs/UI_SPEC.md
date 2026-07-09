# DevFocus — UI Specification

> Companion to [UX_DESIGN.md](UX_DESIGN.md) (§ references point there). That doc
> says what each surface does; this one says exactly how it looks and moves.
> Values are px at default zoom; everything derives from VS Code theme tokens.

---

## 1. Design language

**A flight instrument, not a kitchen timer.** The pomodoro heritage — tomato,
coffee cups, flames, moons — is retired entirely. DevFocus reads like a cockpit
gauge embedded in the IDE: near-monochrome, one signal color, thin precise
numerals, geometry instead of pictograms. No emoji anywhere in the product.

Principles:

- **Reduction is the brand.** Remove until removing breaks meaning; state is
  encoded in *fill vs outline* and *intensity*, not in a color rainbow.
- **Data-forward.** Numbers are the largest thing on every screen. Words are
  small, uppercase, letterspaced — instrument labels, not sentences.
- **Native material.** Only VS Code theme tokens; flat; border-separated;
  no shadows, no gradients, no custom hues.

Hierarchy: **position → size → weight → intensity**. Hue is reserved for one job
(the signal, §4).

---

## 2. Layout & spacing

Base unit **4 px**. Allowed spacings: 4 / 8 / 12 / 16 / 24.

| Token | Value | Use |
|---|---|---|
| `pad-panel` | 12 | panel edge padding |
| `gap-stack` | 8 | default vertical gap between siblings |
| `gap-group` | 16 | between semantic groups (header / dial / actions / footer) |
| `col-max` | 380 | content column max-width, centered |

Corner radius: **2 px** on all controls and cards (sharper than stock VS Code's 3–5;
still native, reads precise). Pills are retired — chips are rectangles.

Breakpoints (ResizeObserver on body):

| Mode | Condition | Changes |
|---|---|---|
| vertical | default | spec below |
| horizontal | w > h | dial left (55%), actions right column, meta rows full-width above |
| compact | w < 160 or h < 160 | dial + time + primary action only; dial 120, time 22 |

---

## 3. Typography

Everything inherits `--vscode-font-family`; base `--vscode-font-size` (13).
Six styles, no seventh:

| Style | Size/weight | Tracking | Use |
|---|---|---|---|
| Display | 34 / **200**, tabular-nums | +2px | timer digits (22/300 compact) |
| Title | 13 / 600 | 0 | screen headings |
| Body | 12 / 400 | 0 | buttons, inputs, cards |
| Label | 10 / 500, uppercase | +2px | instrument labels (FOCUS, WIND-DOWN, LAST 7 DAYS) |
| Meta | 11 / 400, tabular-nums | 0 | today line, intent, captions |
| Micro | 10 / 400 | 0 | skip note, day letters, error text |

The thin Display weight is the identity moment — large, light, precise. Bold
(600) appears at most once per screen. Uppercase exists only in Label style.

---

## 4. Color — monochrome + one signal

The four-hue semantic palette is retired. Two channels only:

| Role | Token | Fallback | Meaning |
|---|---|---|---|
| **Signal** | `--vscode-progressBar-background` (fallback `focusBorder`) | `#0078d4` | *focus is live*: focus arc, done segments, rhythm bars. `progressBar.background` because themes must keep it visible — Cursor's defaults set `focusBorder` at 15% alpha or fully transparent |
| Ink | `--vscode-foreground` | — | primary text; recovery arcs (at reduced intensity) |
| Ink-2 | `--vscode-descriptionForeground` | — | secondary text, labels |
| Structure | `--vscode-widget-border` | `#444` | borders, tracks, pending segments |

State is intensity, not hue:

| State | Treatment |
|---|---|
| Focus running | signal, full intensity |
| Break | ink stroke @ 0.55 — the dial "hollows out" |
| Long break | ink stroke @ 0.35 — deeper rest, dimmer |
| Micro-break | ink stroke @ 0.55 (same family as break) |
| Paused | whatever is showing @ 0.5 |
| Celebration | plain full-intensity ink; no gold, no fire |

Using `focusBorder` as the signal means DevFocus adopts *each theme's own accent*
— it has no color of its own, by design.

**Iconography**: geometry only. Codicons in the status bar (circle family, §5.7);
inline SVG ring for the wordmark; **zero emoji** in UI, notifications, README
badges or docs headings. The 🍅 🌙 🤖 🔥 ☕ set is deleted, not replaced.

---

## 5. Components

### 5.1 The dial (identity component)

- SVG viewBox 200×200, circle r=80, rendered 180×180 (120 compact), rotated −90°.
- Track: stroke 8, `widget-border`.
- Progress: stroke 8, round caps; signal color in focus, ink-at-intensity in
  recovery (§4); `stroke-dashoffset` animated 800ms linear; 400ms ease on state
  color change; one 550ms pulse on phase change.
- Center stack (gap 2): Display digits → Label phase word (focus screen only) →
  paused Label. Nothing else lives in the dial.

### 5.2 Session segments (replaces dots)

Round progress as instrument tick-marks: **16×3 px bars**, radius 1, gap 5,
centered row under the dial.

- done: signal, full intensity
- current: signal @ 0.45
- pending: `widget-border`
- during breaks the just-finished segment counts as done
- tooltip per segment: "Session 2 of 4 — done"

### 5.3 Buttons

All: radius 2, Body text, icon+label gap 5, min hit target 24px tall,
focus-visible = 1px `focusBorder` outline, transitions 100ms ease-out.

| Variant | Look | Use |
|---|---|---|
| Primary | `button-background` / `button-foreground`; padding 5×14 | Start, Resume, I'm back, Apply |
| Secondary | `button-secondaryBackground`; padding 5×14 | Pause, Reset |
| Text | transparent, ink-2 → ink on hover; padding 3×6 | skip break, customize timings |
| Chip | rectangle, 1px `widget-border`, Meta text, padding 3×10 | mode chip `DEEP WORK ▾`, `WAITING ON AI` |
| Icon | 22×22, transparent, 0.7 → 1 + `toolbar-hoverBackground` hover | mute, settings |

### 5.4 Inputs

- Intent (idle): full width, `input-background`, 1px `input-border`, radius 2,
  padding 4×7, Meta size; focus = `focusBorder`.
- Intent (focus screen): quiet variant — transparent bg/border, centered, 12.5px;
  hover reveals border; focus restores the full input look.
- Number fields: 58px, right-aligned digits, invalid = `inputValidation-errorBorder`
  + Micro error text. No red fills.

### 5.5 Cards

Radius 2, card bg (`editorWidget-background`), 1px `widget-border`.
Mode cards: Body 600 name + Micro description, left-aligned, padding 10×12;
hover = `focusBorder` border. Day summary: same recipe, centered, its title set
in Label style ("WIND-DOWN"), not an emoji.

### 5.6 Rhythm strip

- 7 columns, space-between within `col-max`; bar 12 wide, radius 2/2/1/1.
- Height maps sessions → 6–30px vs week max; zero-days = 3px `widget-border` tick.
- Bars in signal color: today full intensity, past days @ 0.5.
- Header: Label "LAST 7 DAYS" left; weekly focus total right (`11h 20m this week`)
  in the same Label style. A fact, not a chain — no streaks.
- Hidden until any day has data.

### 5.7 Day plan rows

- Header: Label "TODAY'S PLAN" left, running score `2/4` right (tabular).
- Row: 22px min height, Meta+ text (11.5px), radius 2, `list-hoverBackground` on
  hover. Active row: 2px inset signal bar (left edge, `box-shadow`, no layout shift).
- Row anatomy: check (circle-large-outline → pass-filled) · label (ellipsized,
  click = make active) · `S2` tally (Micro, tabular) · hover-revealed ↓/↑/× action
  icons (opacity 0 → 0.6 on row hover/focus-within → 1 on self-hover).
- Done rows: strikethrough, 0.55 opacity, sorted below open rows.
- Add input: dashed 1px border, transparent bg; solid + `input-background` on focus.
  Hidden at 5 tasks.
- Later: disclosure header in Label style (`LATER (4)` + chevron), "clear old"
  appears only when stale items exist; stale rows at 0.5 opacity.
- Idle screen only; hidden in compact.

### 5.8 Status bar

Codicon circle family encodes state by fill — the dial motif in 16 px:

| State | Text |
|---|---|
| Idle, fresh | `$(circle-large-outline) DevFocus` |
| Idle, active day | `$(circle-large-outline) 3/8 today` |
| Idle, wind-down | `$(circle-large-outline) 6/8 · wind down` |
| Focus, intent set | `$(circle-filled) 17:20 · fixing auth` |
| Focus, no intent | `$(circle-filled) 17:20 · S2/4` |
| Paused | previous + `$(debug-pause)` |
| Break | `$(circle-outline) 03:36 · Break` |
| Long break | `$(circle-outline) 12:40 · Long break` |
| Micro-break | `$(circle-outline) 02:12 · Micro-break` |

Filled = focus. Outline = recovery. Large-outline = standing by. Never a
background color; intent truncates at 24 chars.

---

## 6. Screen blueprints (vertical, 300px reference)

```
IDLE                          FOCUS                       BREAK
┌──────────────────────┐      ┌──────────────────────┐    ┌──────────────────────┐
│ 3/8 · 1h20m     ◌ ⚙  │      │               ◌ ⚙    │    │               ◌ ⚙    │
│ [ What are you… ]    │      │   fixing auth bug    │    │   BREAK              │
│                      │      │                      │    │   Look 20 ft away…   │
│      ╭─────╮         │      │      ╭─────╮         │    │      ╭─────╮         │
│      │25:00│         │      │      │17:20│         │    │      │03:36│         │
│      ╰─────╯         │      │      │FOCUS│         │    │      ╰─────╯         │
│    ▬ ▬ ▭ ▭           │      │      ╰─────╯         │    │    ▬ ▬ ▬ ▭           │
│                      │      │    ▬ ▭ ▭ ▭           │    │                      │
│   [ Start ]          │      │  [ Pause ] [ Reset ] │    │   [Resume] skip      │
│                      │      │   WAITING ON AI      │    │   2 skipped today    │
│   DEEP WORK ▾        │      │                      │    │                      │
│   LAST 7 DAYS   4D   │      │                      │    │                      │
│   ▂ ▅ ▃ ▁ ▆ ▂ ▇      │      │                      │    │                      │
└──────────────────────┘      └──────────────────────┘    └──────────────────────┘
        ▬ = done/current segment   ▭ = pending
```

Reading order == visual order == DOM order on every screen.

---

## 7. Motion

| Motion | Duration/easing | Trigger |
|---|---|---|
| Hover/active | 100ms ease-out | pointer |
| Screen swap | none — screens replace, never slide | state change |
| Dial tick | 800ms linear | every second |
| Dial intensity/color | 400ms ease | phase change |
| Pulse | 550ms ease-out, once | phase change |
| Colon blink | 1s step-end loop | running only |

`prefers-reduced-motion`: blink and pulse removed; dial updates jump.
No parallax, no springs, no confetti — ever (§UX 13).

---

## 8. Theming discipline

- Dark, light, high-contrast from the same rules — tokens only, zero per-theme CSS.
- The signal color is the theme's own `progressBar.background`: DevFocus inherits
  each theme's progress color rather than imposing one — and unlike `focusBorder`,
  themes are forced to keep it visible.
- High contrast: every interactive element has a border or outline; verify the
  focus ring on all five screens.

## 9. Quality bar (definition of done for any UI change)

1. Legible at 220px panel width; sane at 380px; usable in compact.
2. No hard-coded colors outside token fallbacks. No emoji, no pictograms.
3. Keyboard: tab order = visual order; visible focus on everything interactive.
4. Screenshot in dark + light before shipping.
5. Every element answers a question no other element on the screen answers.
