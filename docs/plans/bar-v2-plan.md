# Bar v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bar v2 Corners shell in `shared/stim.js` and `shared/stim.css`, then move Galaxy onto it as the pilot.

**Architecture:** `initPage({ id, bar })` calls a new exported `buildBar(stage, spec, { id })`. It wraps `.stage` in `.stim-frame` and lays a `.stim-ui` layer over it with five slots. All new CSS sits under `.stim2`. Pages without `bar` take the v1 path unchanged.

**Tech Stack:** Plain ES modules and CSS. No build step. No new library.

**Spec:** [docs/plans/bar-v2.md](bar-v2.md). Read it before each task.

## Global Constraints

- Work in the worktree `.worktrees/stimming-tbpn` on branch `feature/stimming-tbpn` (ADJUDANT: a feature bean gets a worktree). Merge by PR after Tom signs off the pilot.
- Commit by explicit path only. Use `tools/commit.sh` when it exists; otherwise `git commit -m "<msg>" -- <paths>`. Never `git add -A` or `git commit -a`.
- No Playwright (Tom). Every check runs in the built-in browser pane.
- No new library. No change to the importmap.
- Code comments follow ASD-STE100: one fact per line, twelve words or fewer, active voice.
- Dark only. Colours are OKLCH tokens.
- Tokens, verbatim: `--slab: "Iosevka Term Slab", ui-monospace, monospace`; `--glass: oklch(0.13 0.012 275 / 0.86)`; `--shadow: 3px 3px 0 oklch(0.07 0.01 275)`; `--hard: 5px 5px 0 oklch(0.05 0.01 275)`.
- Text: slab 500, 11 px, caps, 0.07em tracking. Keycaps: slab 700, 10 px.
- Chips: 26 px tall, 34 px under `(pointer: coarse)`; 2 px radius; 1 px `--line` border; `--glass` backing. Picked: `--fg` fill, `--bg` text, `--shadow`.
- Slider: 2 px track, filled part in `--fg`, 6 × 12 px bar thumb.
- Sheets: 280 px wide (full width less 20 px when narrow); 1 px `--fg` border; `--hard` shadow; backing `oklch(0.12 0.012 275 / 0.97)`.
- Limits: five visible controls, three actions, one slider, four key entries, five options for `segments`.
- Narrow below 640 px of frame width. The toy name hides below 360 px.
- Key strip fades after three stage gestures or 8 s, counted from the end of the intro.
- Storage key per setting: `stimming.<id>.<setting id>`.
- v1 stays: `choices()`, `qualitySetting()`, `settingsTray()`, `.bar` CSS and `header[data-shell]` do not change.

## Decisions this plan adds to the spec

| Point | Decision |
|---|---|
| Layer placement | The shell wraps `.stage` in `div.stim-frame` and appends `div.stim-ui` beside it. Control events never bubble into the stage. |
| Test page | `tests/bar-v2.html` (`noindex`) builds fixtures with `buildBar` and prints `PASS`/`FAIL` lines, then `DONE p/t`. |
| Toy info | `buildBar` starts with the fallback name (`.intro-name` text, else the id). `initPage` fetches `toys.json` once and calls `ui.applyToy(info)`. This replaces `legacyLink()` on v2 pages. |
| Restore | A persisted setting restores into its control at build. The toy reads `ui.setting(id).value`; the shell fires no handler on restore. |
| Fonts | `stim.css` gains the "Iosevka Term Slab" 500 and 700 `@font-face` rules. `index.html` does not link `stim.css`, so its own rules stay. `intro.css` keeps its Nerd Font family. |
| (i) and screen readers | The faded key strip uses opacity only. It stays in the accessibility tree as `dl[aria-label="How to play"]`. With `keys: false` the (i) is not drawn. |
| Galaxy storage | Galaxy's setting ids are `streakStars` and `streakFx`, so Tom's saved values carry over. |
| No-WebGPU path | `ui.hideControls()` hides everything but the back block and the name. |

## Review Focus

1. A stored value is junk (`"abc"`, out of range, a removed option): the control shows the spec's `value`, and the stored key is ignored. Test in Task 4.
2. The toy is missing from `toys.json`, or the fetch fails: the name falls back, no tag shows, the console stays clean. Test in Task 1.
3. A shortcut key with Cmd, Ctrl or Alt, or while focus sits in an input or a sheet: the shell ignores it. Cmd+C must still copy. Test in Task 3.
4. A press on a control is not a stage gesture: it never counts toward the key strip fade and never reaches the stage. Test in Task 5.
5. The frame crosses 640 px with a sheet open, or with the slider moved into Settings: every value survives, and the sheet closes. Test in Task 6.

## Files

| File | Change |
|---|---|
| `shared/stim.js` | New section "bar v2": `buildBar`, control builders, sheet, key strip, narrow layout. `initPage` gains `bar`. |
| `shared/stim.css` | New section under `.stim2`: tokens, fonts, frame, slots, chips, choice, slider, sheet, key strip, narrow rules. |
| `tests/bar-v2.html` | New. Fixture page and assertions. `noindex`. |
| `galaxy/index.html` | Pilot: markup, CSS and wiring move to the spec object. |
| `AGENTS.md` | Control bar sections point to the spec. |
| `.claude/launch.json` | Local only, not committed: config `stimming-bar` on port 8001 that serves the worktree. |

## Interfaces (shared by all tasks)

```js
// shared/stim.js
export function buildBar(stage, spec, { id, keyDelay = 8000 }) → ui
export function initPage({ id, silent = false, home = '../index.html', bar = null }) → { sound, ...ui }

// Every handle
{ value, set(v, fire = false), disabled }

ui = {
  choice,                 // handle or null
  slider,                 // handle or null
  setting(id),            // handle or null
  action(id),             // handle; id is the action's verb
  keys: { show(), hide(), shown },
  applyToy({ name, sub, tier, legacy }),
  hideControls(),
}
```

Spec shapes, beyond the spec's API section:
- Action: `{ verb, noun?, label?, key?, onPress }`. Labels: `add` → `+ ${noun}`; `shuffle` → die icon and `Shuffle`; `clear` → `Clear`; `reset` → `Reset`; any other verb → `label ?? capitalised verb`.
- Choice option: `{ value, label, icon?, dot?, key? }`. `dot` is a CSS colour for the palette square.
- Setting row: `{ type: 'slider' | 'choice' | 'toggle', id, label, persist?, onInput | onPick | onToggle, ...range or options }`. Toggle values are booleans, stored as `'1'`/`'0'`.

DOM names all tasks use: `.stim-frame`, `.stim-ui`, slots `.s2-tl .s2-tr .s2-bl .s2-br .s2-keys`, `.s2-back`, `.s2-name`, `.s2-tag`, `.s2-chip`, `.s2-seg`, `.s2-step`, `.s2-tray`, `.s2-slider`, `.s2-sheet`, `.s2-set`, `.s2-info`, `.snd`. State: `.stim-frame[data-narrow]`, `.s2-keys.is-faded`, `.s2-sheet[hidden]`.

---

### Task 1: Frame, layer, top corners and look

**Files:**
- Modify: `shared/stim.js` (new "bar v2" section after `initPage`; `initPage` gains `bar`)
- Modify: `shared/stim.css` (new `.stim2` section at the end)
- Create: `tests/bar-v2.html`

**Interfaces:**
- Produces: `buildBar`, `ui.applyToy`, `ui.hideControls`, the frame, the layer, the five slots, `.s2-chip` styles.

- [ ] **Step 1: Set up the worktree and the preview**

```bash
git -C "/Users/tomlinson/Projects/VIBE CODING/stimming" worktree add .worktrees/stimming-tbpn -b feature/stimming-tbpn
```

Add a `stimming-bar` entry to `.claude/launch.json` (main checkout, uncommitted): the same server with `os.chdir('.worktrees/stimming-tbpn')` first and `port` 8001.

- [ ] **Step 2: Write the test page and the first tests**

`tests/bar-v2.html`: `<meta name="robots" content="noindex">`, links `../shared/stim.css`, holds one `<main><div class="stage" style="height:400px"></div></main>` per fixture. Fixtures use the id `bartest`, so no toy's stored values change. A module script imports `buildBar` and defines `t(name, fn)` (sync or async) that appends `PASS name` or `FAIL name: <error>` to `<pre id="out">`, then `DONE p/t`.

Tests:
- `frame wraps stage`: `stage.parentElement.classList.contains('stim-frame')`, and `.stim-ui` is its next sibling.
- `root gets stim2`: `document.documentElement.classList.contains('stim2')`.
- `back block links home`: `.s2-back` is an `a` with `href` ending `index.html` and `aria-label="Back to Stimming"`.
- `fallback name`: with no `.intro-name`, `.s2-name` text equals the id (`bartest`). CSS sets the caps.
- `applyToy tags`: after `ui.applyToy({ name: 'Galaxy', sub: 'Stimming Lab', tier: 'beta' })`, `.s2-name` starts with `Galaxy` and `.s2-tag` texts are `LAB` and `BETA`.
- `applyToy missing toy`: `ui.applyToy(undefined)` leaves the fallback name and throws nothing.
- `cluster order`: `.s2-tr` children in order: (legacy link only after `applyToy({ legacy: true })`), `.snd`, `.s2-set`, `.s2-info`.
- `empty slot draws nothing`: with no actions and no slider, `.s2-bl` and `.s2-br` have no children and `display: none`.
- `hideControls`: after the call only `.s2-back` and `.s2-name` are visible.

- [ ] **Step 3: Run the page; the tests fail**

`preview_start` `stimming-bar`, open `http://localhost:8001/tests/bar-v2.html`, `get_page_text`.
Expected: an import error or `FAIL` lines.

- [ ] **Step 4: Build `buildBar` and the top corners**

- The back block holds `‹` and the `MARK` letters in a `.mark` span. On hover or focus it opens to `‹ Stimming` and reuses the `stim-wave` keyframes.
- The legacy link (`Classic` or `Fresh`) keeps today's rules from `legacyLink()` and the `.ver--build` flash box.
- `.snd` uses `SOUND_SVG`; `.s2-set` uses `SLIDERS` and hides when there are no setting rows and no `quality`; `.s2-info` shows `i`.
- CSS: the tokens, the two `@font-face` rules, `.stim-frame { position: relative; container: stim / inline-size }`, `.stim-ui { position: absolute; inset: 0; pointer-events: none }`, slot children `pointer-events: auto`, slots inset 12 px.
- `initPage`: with `bar`, call `buildBar(document.querySelector('.stage'), bar, { id })`, wire `.snd` as the sound button, fetch `toys.json` once and call `ui.applyToy(toys[id])`. Skip `legacyLink`, `mouseKeys` and `howTip`. Keep `fitStage`.

- [ ] **Step 5: Run the page; every test passes**

Expected: `DONE 9/9`, no `FAIL`, a clean console (`read_console_messages` with `onlyErrors`).

- [ ] **Step 6: Commit**

`git commit -m "Bar v2: frame, layer and top corners" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 2: Choice: segments, stepper, tray

**Files:**
- Modify: `shared/stim.js`, `shared/stim.css`, `tests/bar-v2.html`

**Interfaces:**
- Consumes: `buildBar`, `.s2-tl`.
- Produces: `ui.choice`, `makeChoice(spec, display) → { el, handle }` (internal; Task 6 rebuilds with it), `makeSheet({ title, anchor, align }) → { el, open(on), isOpen }` (internal; Task 4 reuses it).

- [ ] **Step 1: Write the failing tests**

- `auto segments`: three options build `.s2-seg` with three `.s2-chip`, one `aria-pressed="true"`.
- `auto stepper`: six options build `.s2-step` showing the value's label; `›` steps to the next option and wraps at the end.
- `arrow keys step`: ArrowRight on a focused segment chip picks the next option and calls `onPick` once.
- `tray`: `display: 'tray'` builds a `+ Star` chip; a click opens a `.s2-sheet` grid of icon buttons with `aria-label` from `label`; a pick sets the chip to `+ Binary`, closes the sheet and calls `onPick('binary')`.
- `set does not fire`: `ui.choice.set('pulsar')` updates `value` and the control and calls no handler; `set('pulsar', true)` calls it once.
- `disabled`: with `ui.choice.disabled = true`, a click changes nothing and the control has `aria-disabled="true"`.
- `palette dot`: an option with `dot` draws a square `.s2-dot` with that background.
- `option key`: an option with `key: '1'` picks on keydown `1`.

- [ ] **Step 2: Run; the new tests fail**

- [ ] **Step 3: Build `makeChoice` and `makeSheet`**

The sheet opens on click only; it closes on Escape, a press outside or its button, then returns focus to the button. Tab stays inside it. Opening one sheet closes any other.

- [ ] **Step 4: Run; all tests pass**

- [ ] **Step 5: Commit**

`git commit -m "Bar v2: choice in segments, stepper and tray" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 3: Actions, slider and shortcut keys

**Files:**
- Modify: `shared/stim.js`, `shared/stim.css`, `tests/bar-v2.html`

**Interfaces:**
- Consumes: `buildBar`, `.s2-bl`, `.s2-br`.
- Produces: `ui.action(verb)`, `ui.slider`, `makeSlider(spec) → { el, handle }` (internal; Tasks 4 and 6 reuse it), `bindKey(key, fn)` (internal).

- [ ] **Step 1: Write the failing tests**

- `action labels`: verbs `add` (noun `Star`), `shuffle`, `clear` render `+ Star`, a die icon with `Shuffle`, `Clear`.
- `action press`: a click calls `onPress` once; with `disabled = true`, a click calls nothing and the chip has `aria-disabled="true"`.
- `action key`: `key: 'C'` binds `c` and `C`; a fine pointer shows a `kbd` with `C` on the chip.
- `keys ignore modifiers`: keydown `c` with `metaKey`, `ctrlKey` or `altKey` calls nothing.
- `keys ignore fields`: keydown `c` with focus in an `input` or inside an open `.s2-sheet` calls nothing.
- `slider`: renders the word label and no number; `input` at 0.6 calls `onInput(0.6)` as a number; `ui.slider.set(0.9)` moves the thumb and calls nothing.
- `limits warn`: four actions log one `console.warn` and still render. `clear` and `reset` together as actions also warn.

- [ ] **Step 2: Run; the new tests fail**

- [ ] **Step 3: Build actions, `makeSlider` and `bindKey`**

The slider styles a native `input[type=range]` to the 2 px track and the 6 × 12 px thumb.

- [ ] **Step 4: Run; all tests pass**

- [ ] **Step 5: Commit**

`git commit -m "Bar v2: actions, slider and shortcut keys" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 4: Settings sheet

**Files:**
- Modify: `shared/stim.js`, `shared/stim.css`, `tests/bar-v2.html`

**Interfaces:**
- Consumes: `makeSheet`, `makeSlider`, `setQuality`, `onQuality`, `quality`, `store`.
- Produces: `ui.setting(id)`; the sheet's first section accepts a moved slider (Task 6).

- [ ] **Step 1: Write the failing tests**

- `sheet anatomy`: header `SETTINGS` with `esc`; a section labelled with the toy name holding the toy rows in order; a `SITE` section with Quality `Standard`/`High`; a footer with `Reset`.
- `row types`: a `choice` row renders segments; a `toggle` row renders `Off`/`On`; their handlers get the value and a boolean.
- `persist writes`: moving a `persist` slider writes `stimming.bartest.<id>`.
- `persist restores`: with `stimming.bartest.<id>` = `'0.4'` before build, `ui.setting(id).value` is `0.4` and no handler fired.
- `junk restores to default`: stored `'abc'`, `'9'` (above `max`) or a removed choice option leaves the spec's `value`.
- `quality row`: a click on `High` calls `setQuality('high')`; a `stim:quality` event updates the chips.
- `reset`: the footer button calls `reset` once and closes the sheet.
- `no rows hides button`: no setting rows and `quality: false` hides `.s2-set`.
- `focus`: opening moves focus into the sheet; Escape closes it and returns focus to `.s2-set`.
- `no hover open`: `mouseenter` on `.s2-set` leaves the sheet hidden.

- [ ] **Step 2: Run; the new tests fail**

- [ ] **Step 3: Build the Settings sheet on `makeSheet`**

- [ ] **Step 4: Run; all tests pass. Clear the test keys from `localStorage` at the end of the page.**

- [ ] **Step 5: Commit**

`git commit -m "Bar v2: Settings drop sheet" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 5: Key strip

**Files:**
- Modify: `shared/stim.js`, `shared/stim.css`, `tests/bar-v2.html`

**Interfaces:**
- Consumes: `.s2-keys`, `.s2-info`, `reduced()`.
- Produces: `ui.keys`, `keyWord(word, touch) → string` (internal).

- [ ] **Step 1: Write the failing tests**

- `entries`: `keys: [['click', 'place'], ['scroll', 'zoom']]` renders `dl[aria-label="How to play"]`; each entry is a `kbd` then a lower-case verb.
- `touch words`: `keyWord('click', true)` is `TAP`; `'scroll'` gives `PINCH`; `'double-click'` gives `DOUBLE-TAP`; `'hold + drag'` stays.
- `fade on gestures`: three `pointerdown` events on the stage add `.is-faded`.
- `controls are not gestures`: three clicks on a chip leave the strip shown.
- `fade on time`: the 8 s timer starts once no `.intro` remains; the test removes its fake `.intro` and advances by overriding the delay through `buildBar(..., { id, keyDelay: 50 })`.
- `(i) returns it`: a click on `.s2-info` removes `.is-faded`; `aria-expanded` follows.
- `keys false`: no `.s2-keys` and no `.s2-info`.
- `five entries warn`: one `console.warn`.

- [ ] **Step 2: Run; the new tests fail**

- [ ] **Step 3: Build the key strip**

The strip sits bottom centre, above the bottom row when `.s2-bl` or `.s2-br` holds anything. Reduced motion drops the fade transition. Pointer type comes from `matchMedia('(pointer: coarse)')` and updates on change.

- [ ] **Step 4: Run; all tests pass**

- [ ] **Step 5: Commit**

`git commit -m "Bar v2: key strip" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 6: Narrow layout

**Files:**
- Modify: `shared/stim.js`, `shared/stim.css`, `tests/bar-v2.html`

**Interfaces:**
- Consumes: `makeChoice`, `makeSlider`, the Settings sheet's first section.
- Produces: `place(narrow)` (internal), driven by a `ResizeObserver` on `.stim-frame`.

- [ ] **Step 1: Write the failing tests** (a fixture sets its `main` width, then waits two frames)

- `narrow moves`: at 375 px, `data-narrow` is set; the choice sits in `.s2-bl` as `.s2-step`; actions sit in `.s2-br`; the slider is the first row of the Settings sheet.
- `narrow without choice`: actions in `.s2-bl`, the slider in `.s2-br`.
- `tray stays tray`: a `tray` choice stays a `+ Name` chip at 375 px.
- `values survive`: pick option 3 and set the slider to 0.7, cross to 375 px and back to 1280 px; both values hold.
- `crossing closes sheets`: an open sheet closes when `data-narrow` changes.
- `name hides`: at 340 px `.s2-name` has `display: none`.
- `touch targets`: under `(pointer: coarse)` a chip measures 34 px tall (checked in the pane with the mobile preset, Step 4).

- [ ] **Step 2: Run; the new tests fail**

- [ ] **Step 3: Build `place(narrow)` and the container rules**

- [ ] **Step 4: Run; all tests pass. Then `resize_window` preset `mobile`, reload, and check the touch-target test and the touch words.**

- [ ] **Step 5: Commit**

`git commit -m "Bar v2: narrow layout" -- shared/stim.js shared/stim.css tests/bar-v2.html`

---

### Task 7: Galaxy pilot

**Files:**
- Modify: `galaxy/index.html` (CSS 26-48; markup 59 and 64-107; script 125-132, 284-290, 376-381, 1838-1879)

**Interfaces:**
- Consumes: `initPage({ id, bar })`, every handle above.

- [ ] **Step 1: Replace the markup**

Delete `<header data-shell>`, the `.bar` and the `dl.how`. Keep `.stage`, `.fail`, the intro and `section.about`.

- [ ] **Step 2: Delete the local CSS**

Delete the `.adder`, `.add`, `#add`, `#addBtn`, `.setter`, `#setBtn` and `.sets` rules.

- [ ] **Step 3: Pass the spec object**

Use the spec's Galaxy example with these values:
- The choice carries the 17 kinds as `tray` options, with their current SVG icons and `title` text as `label`.
- `onPick` sets `pick` and focuses the stage.
- The slider is Gravity, `min` 0.3, `max` 1.2, `step` 0.05, `value` 0.3, and sets `pace`.
- Settings rows use ids `streakStars` and `streakFx`, both with `persist: true`.
- Keys: `['click', 'place']`, `['hold + drag', 'throw a cluster']`, `['drag', 'move']`, `['scroll', 'zoom']`.
- Clear and Reset call through a module-scope `act = { clear() {}, reset() {} }`; `start()` assigns `clearAll` and `resetAll` to it.
- Delete `qualitySetting(...)`, `popover()` and the old wiring.
- The `c` branch leaves Galaxy's keydown, because the action binds `C`. `R`, Space and zoom stay.
- `starStreak` and `fxStreak` start from `ui.setting(...).value`; delete `saved()` and `save()` if nothing else uses them.
- `noWebGPU()` calls `ui.hideControls()`.

- [ ] **Step 4: Check in the pane** (`http://localhost:8001/galaxy/`)

Run the spec's checks 1 to 8:
1. The console is clean on load and after each control.
2. At 1280 px and 375 px no control overlaps another.
3. Tab reaches the controls in slot order; Escape closes a sheet.
4. The touch words show under the mobile preset.
5. The strip fades after three placements and returns on (i).
6. The streak values survive a reload.
7. Reduced motion shows no transitions.
8. `http://localhost:8001/pop/` looks as it does on `main`.

Reset the viewport to `desktop` after the checks.

- [ ] **Step 5: Commit and push the branch; open a PR**

`git commit -m "Galaxy: Bar v2 pilot" -- galaxy/index.html`, then `git push -u origin feature/stimming-tbpn`, then `gh pr create` with screenshots at 1280 px and 375 px.

- [ ] **Step 6: Tom signs off**

Show Tom the two screenshots and leave the Galaxy page loaded on port 8001. Fix what he flags, in new commits on the branch.

---

### Task 8: Standard and merge

**Files:**
- Modify: `AGENTS.md` ("Control bar standard" and "Controls")
- Modify: `.beans/stimming-tbpn--bar-v2-the-corners-shell.md`, `.beans/stimming-848s-*.md`

- [ ] **Step 1: Rewrite the two AGENTS.md sections**

Use the spec's slot table and a link to `docs/plans/bar-v2.md`. Add one line: un-migrated pages keep v1 until Tom moves them.

- [ ] **Step 2: Close `stimming-848s` as scrapped, with "Superseded by Bar v2 (stimming-tbpn)." Tick the tbpn checklist.**

- [ ] **Step 3: Commit, push and merge the PR after Tom approves; remove the worktree and the local `stimming-bar` launch entry.**

Then start the ten-toy session (spec Rollout step 4). It is a separate session with its own brief.
