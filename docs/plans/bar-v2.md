# Bar v2: the Corners shell

Spec. Tom approved the design on 2026-11-08. Bean: `stimming-tbpn`.
It replaces the control bar standard of 2026-11-03 in `AGENTS.md` and bean `stimming-848s`.
Mockups: the brainstorm screens `layout-v2`, `onscreen`, `settings` and `phone` (Corners, Keys, Drop sheet, Corners stay).

## Why

The audit of 51 toys found four problems. Tom confirmed all four.

1. **Inconsistent.** 16 toys hand-roll a popover tray. Five steppers have five builds. Toys restyle the shared bar.
2. **Off-brand.** The bar uses round Gabarito pills. The menu, the intro and the icons use slab caps, flash boxes and hard shadows.
3. **Settings is a dump.** Trays hold sliders, chips and Reset in any order. Quality sits in some trays and not others.
4. **Hard to build.** Each toy writes 40 to 120 lines of bar markup, CSS and wiring.

## Decisions

| | Decision |
|---|---|
| Layout | **Corners.** Controls sit in the four corners of the stage. The page header goes. |
| On-screen layer | **Keys.** A printed key strip at the bottom centre. No readout, no crop marks. |
| Settings | **Drop sheet** from the top-right cluster. The toy keeps running. |
| Phones | **Corners stay.** All controls stay on the stage. |
| Toy API | **One spec object** passed to `initPage`. The shell builds all controls. |
| Pilot | **Galaxy.** Tom then picks the next toys. |
| After the pilot | One session builds ten new Lab toys on Bar v2 (see Rollout). |

## 1. Slots

```
┌────────────────────────────────────────────────────────────┐
│ [‹] [GALAXY] [choice]                      [◁] [⚙] [i]     │
│                                                            │
│                         stage                              │
│                                                            │
│              [CLICK] place  [DRAG] orbit                   │
│ [+ STAR] [CLEAR]                          [GRAVITY ━━▮──]  │
└────────────────────────────────────────────────────────────┘
```

| Slot | Holds | Limit |
|---|---|---|
| Top left | Back block, toy name, then the choice | One choice group. See the choice rules below. |
| Top right | Sound, Settings, (i). The Classic or Fresh link (only with `legacy`) sits in Settings, under Build | Fixed order. Does not count to the limit. |
| Bottom left | Actions | Three at most. |
| Bottom right | Main slider | One at most. A word label, no number. |
| Bottom centre | Key strip | Four entries at most. |

- At most five visible controls. A choice group counts as one. The top-right cluster does not count.
- An empty slot draws nothing.

**Back block.** It shows `‹`. On hover or focus it opens to `‹ Stimming` and runs the mark's wave. It links to the menu.

**Toy name.** Slab caps, from `toys.json` `name`. A Lab toy adds a quiet `LAB` tag. A toy with the new optional `toys.json` field `tier: "beta"` or `"alpha"` adds that tag, as the menu does.

**Choice.** Three displays. The shell picks one unless the toy sets `display`.

| Display | When | Look |
|---|---|---|
| `segments` | Five options or fewer | One joined block, hairline dividers. The picked option is the flash box. |
| `stepper` | More than five options | `‹ Name ›` block. Arrows and the arrow keys step. |
| `tray` | The toy sets it; options carry icons | A chip `+ Name` opens a grid sheet below the top-left corner. Same anatomy as the Settings sheet. |

Palette options carry a square colour dot.

**Actions.** The shared verbs keep their meaning.

| Verb | Label | Notes |
|---|---|---|
| `add` | `+ Noun` | Adds one thing. |
| `shuffle` | die icon, `Shuffle` | Randomizes everything. |
| `clear` | `Clear` | Empties. |
| `reset` | `Reset` | Returns to the start. Lives in the Settings footer when Clear is shown. |
| own verb | one word | Drip, Blow, Flip, Ping. |

An action can be disabled (`aria-disabled`) when it would do nothing.

**Key strip.** Bottom centre, above the bottom row when a bottom slot is used.
- Each entry is a keycap, then a verb in lower case. Example: `[CLICK] place`.
- Mouse and touch words swap by pointer type: `CLICK`/`TAP`, `SCROLL`/`PINCH`, `DOUBLE-CLICK`/`DOUBLE-TAP`.
- Keys show on fine pointers only.
- It fades out after three gestures on the stage or after 8 s, whichever comes first.
- (i) toggles it back. (i) also opens the how-to as a sheet for screen readers.
- A toy with its own on-screen legend sets `keys: false`. Today: Sonar, Oscilloscope, ShadyOS.

**Diegetic toys.** A toy's own on-screen UI draws on its canvas, under the shell layer. The shell never reads it.

### Phones (stage narrower than 640 px)

- Top left: back block and toy name. The name hides below 360 px.
- Top right: unchanged.
- Bottom left: the choice, always as a `stepper` (or as its `tray` chip). With no choice, the actions.
- Bottom right: the actions. With no choice, the slider.
- The slider moves to the first row of the Settings sheet when the bottom right holds actions.
- Touch targets are 34 px.
- The key strip uses touch words and sits above the bottom row.

## 2. Look

All new rules live in `shared/stim.css` under `.stim2`. The shell adds `.stim2` to `<html>` when a page passes `bar`.

| Token | Value | Use |
|---|---|---|
| `--slab` | `"Iosevka Term Slab", ui-monospace, monospace` | All control text |
| `--glass` | `oklch(0.13 0.012 275 / 0.86)` | Control backing |
| `--shadow` | `3px 3px 0 oklch(0.07 0.01 275)` | Picked chip |
| `--hard` | `5px 5px 0 oklch(0.05 0.01 275)` | Sheets |

- Text: slab, 500, 11 px, caps, 0.07em tracking. Keycaps: 700, 10 px.
- Chips: 26 px tall (34 px on touch), 2 px radius, 1 px `--line` border, `--glass` backing.
- Picked: `--fg` fill, `--bg` text, `--shadow`. This is the intro's flash box.
- Choice groups: one block, 1 px hairlines between options.
- Slider: a 2 px track, the filled part in `--fg`, a 6 × 12 px bar thumb.
- Sheets: 1 px `--fg` border, `--hard` shadow, near-opaque backing. Header row `SETTINGS` with `esc` on the right.
- Key strip: no backing. Keycaps have a 1 px border at 45% `--fg`; verbs at 62% `--fg`.
- The Iosevka `@font-face` rules move from `index.html` and `shared/intro.css` into `stim.css`.
- Reduced motion: no transitions; the key strip shows and hides at once.

## 3. Settings sheet

It drops from the top-right cluster, right-aligned, 280 px wide (full width less 20 px on phones).

```
┌ SETTINGS ─────────────── esc ┐
│ GALAXY                       │
│ Star streaks     ━━▮──────── │
│ Effect streaks   ━▮───────── │
├──────────────────────────────┤
│ SITE                         │
│ Quality     [STANDARD][HIGH] │
├──────────────────────────────┤
│           [ RESET ]          │
└──────────────────────────────┘
```

- Section 1: the toy's rows, under the toy name. On phones the slider comes first.
- Section 2: site rows. Today only Quality. Shown when `quality` is true.
- Footer: Reset, when the toy passes `reset`.
- Row types: `slider`, `choice` (segments, five options at most), `toggle` (`Off`/`On` segments).
- Opens on click or tap. Hover does not open it.
- Closes on Escape, a click outside, or the button again. Focus returns to the button.
- Focus moves into the sheet when it opens. Tab stays inside it.
- A row with `persist: true` stores its value in `stimming.<id>.<setting id>`.
- With no toy rows and no Quality, the Settings button hides.

## 4. API

```js
import { initPage } from '../shared/stim.js';

const ui = initPage({
  id: 'galaxy',
  bar: {
    choice: {
      label: 'Add', display: 'tray', value: 'star',
      options: [{ value: 'star', label: 'Star', icon: '<svg…>' }, …],
      onPick: v => { kind = v; },
    },
    slider: { label: 'Gravity', min: 0.3, max: 1.2, step: 0.05, value: 0.3, onInput: v => { g = v; } },
    actions: [{ verb: 'clear', key: 'C', onPress: clear }],
    settings: [
      { type: 'slider', id: 'starStreak', label: 'Star streaks', min: 0, max: 1, step: 0.01, value: 0.18, persist: true, onInput },
      { type: 'slider', id: 'fxStreak', label: 'Effect streaks', min: 0, max: 1.2, step: 0.01, value: 0.18, persist: true, onInput },
    ],
    reset: resetAll,
    quality: true,
    keys: [['click', 'place'], ['hold + drag', 'throw a cluster'], ['drag', 'move'], ['scroll', 'zoom']],
  },
});

ui.choice.set('pulsar');          // updates the control; fire = false by default
ui.slider.set(0.6);
ui.setting('starStreak').set(0.2);
ui.action('clear').disabled = true;
ui.keys.show();
```

- `initPage` returns `{ sound }` today. With `bar` it also returns `choice`, `slider`, `setting(id)`, `action(id)` and `keys`.
- Every handle has `value`, `set(v, fire = false)` and `disabled`.
- Key shortcuts: `key` on an action or a choice option binds that key. The shell ignores keys while focus is in a text field or a sheet.
- The stage element is `.stage`. The shell places its layer, `.stim-ui`, inside `main` over the stage.
- The shell reads `name`, `sub`, `legacy` and `tier` from `toys.json`. The toy does not repeat them.
- The shell calls the toy's handlers only on user input, never on `set`.

### Kept for old pages

`choices()`, `qualitySetting()`, `settingsTray()`, `.bar` CSS and `header[data-shell]` stay as they are.
A page without `bar` renders exactly as today. v1 is removed only after the last toy moves.

## 5. Rollout

1. **Shell.** Build v2 in `shared/stim.js` and `shared/stim.css`. Only pages that pass `bar` change.
2. **Pilot: Galaxy.** Replace Galaxy's header, bar, Add tray and Settings markup with the spec above. Delete its local tray CSS and `popover()` wiring. Tom signs off at 1280 px and 375 px.
3. **`AGENTS.md`.** Replace "Control bar standard" and "Controls" with this spec's slot table and a link here. Close bean `stimming-848s` as superseded.
4. **Ten new toys.** After Tom signs off the pilot, one session builds these into the Lab on Bar v2, each with a low-fi menu icon and a `toys.json` entry: Sunbeam dust, Wind map, Collatz coral, Ulam spiral, Pull chain, Washing line, Dry ice fog, Bench, Marsh launch, Canal at dusk. Each follows its plan in `docs/plans/`.
5. **Migration.** Tom picks the next toys. Each toy moves in its own session, one commit per toy.

## 6. Checks

No Playwright (Tom). Check in the built-in browser pane.

1. The console is clean on load and after every control.
2. At 1280 px and 375 px: no control overlaps another; the stage stays fully visible.
3. Keyboard: Tab reaches every control in slot order; Escape closes a sheet; arrow keys step the choice.
4. Touch words show under touch emulation; mouse words show with a mouse.
5. The key strip fades after three gestures and returns on (i).
6. Persisted settings survive a reload.
7. Reduced motion: no transitions.
8. A page without `bar` (for example Pop field) looks exactly as before.

## Out of scope

- Render hosts and the three.js 0.187 bump: their own spec.
- Preview cards (og images): their own spec. The emblem is the card icon.
- Retiring v1 CSS and helpers.
- Readouts and crop marks (Plate): not chosen.
