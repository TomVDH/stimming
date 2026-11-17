---
# stimming-sm42
title: 'Soap cutting: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:15:05Z
updated_at: 2026-11-17T21:15:05Z
parent: stimming-a5rs
---

One of the 77 toys that follow the first ten (Tom, 2026-11-17: "also proceed with all the toys -- subagetns for all -- per 5"; epic stimming-a5rs).
A subagent read the toy and wrote this review; it did not play the toy. The toy's one code change is `signal: true`.

## Checklist

- [x] Switch the toy to Bar v3 (`signal: true`)
- [x] Review every control, label, help row and line of copy, as a proposal
- [ ] Tom rules on the proposal
- [ ] Apply the copy and the fixes under "Under Bar v3"
- [ ] 1280 px, 375 x 812 and 812 x 375 on the real page; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## The review (proposal; no word is changed)

**Soap cutting (`soap`): review for Bar v3**

Spec: `soap/index.html:114`. Renderer need: WebGL 2 (three 0.170 `WebGLRenderer`, line 2719; the page says "WebGL"). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Soap | Mint, Amber, Charcoal, Layers, Coral, Swirl; each has a `dot` (a colour or a gradient, `swatchCss`, line 99) | 1 to 6 | `setSoap`: a new bar of that soap slides in. The first soap is random at each load (line 105). |
| Action | New bar | | N | `newBar` (line 2513): sweeps the board off and slides a whole bar in. |
| Action | Blow | | B | `blow` (line 2455): a gust takes the shavings and every piece under 40 cells off the mat. Bigger pieces stay. |
| Settings | Quality | the site's steps | | `quality: true`; `onQuality` re-fits the renderer (line 2215). |
| Slider, Dev, Reset | none | | | No `slider`, `dev` or `reset:` in the spec. |

### Controls

No row changes.

Kept: Soap and its six names; New bar; Blow; Quality. New bar and Blow stay on the bar: both are play, and Space ends in `newBar` when no cut is left (line 1688). New bar is the toy's own reset, so no `reset:` is proposed.

### How to play

`keys` has two lists, picked once at load by `(pointer: coarse)` (lines 113, 123). Without `help`, Bar v3 adds N, B and 1 to 6 by itself on a desktop.

| Input | Have | Suggested |
|---|---|---|
| Drag | score, saw deeper | Score the soap |
| Drag back and forth | (in the row above) | Cut a score deeper |
| Drag from the mat | slice through (touch list only; a mouse does it too, line 2615) | Slice through the soap |
| Shift and drag | slice through, as `shift + drag` | Hold in a drag to slice through (keycap `shift`) |
| Click a scored cube | pop, as `tap a cube` (touch list only) | Pop a scored cube |
| Hold a scored cube | spread the crack (touch list only) | Spread the crack |
| Release | (not listed) | Pop the cracked cubes |
| Ctrl and click | pop the grid, as `ctrl + click` | Hold in a click to pop the whole grid (keycap `ctrl`) |
| Space | next cut | Make the next cut |
| Enter | (not listed) | Pop the whole grid |
| B | blow (from the action) | Blow the small pieces off the mat |
| N | new bar (from the action) | Start a new bar |
| 1 to 6 | one row per soap name (from the list) | Change the soap |

### The `help` list, ready to paste

```js
help: [['drag', 'Score the soap'], ['drag back and forth', 'Cut a score deeper'], ['drag from the mat', 'Slice through the soap'],
  ['shift', 'Hold in a drag to slice through'], ['click', 'Pop a scored cube'], ['hold', 'Spread the crack'], ['release', 'Pop the cracked cubes'],
  ['ctrl', 'Hold in a click to pop the whole grid'], ['space', 'Make the next cut'], ['enter', 'Pop the whole grid'],
  ['B', 'Blow the small pieces off the mat'], ['N', 'Start a new bar'], ['1 2 3 4 5 6', 'Change the soap']],
```

With it the two `keys` lists and the `coarse` test (line 113) can go: the builder hides key rows on touch by itself.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (line 42) | Six long sentences, about 95 words | "A bar of soap on a cutting mat. A dashed line shows where a cut lands. Drag across the soap to score it. Drag back and forth to cut deeper. Hold Shift and drag to slice through. Drag in from the mat to slice through. Fallen pieces cut too. Click a scored cube to pop it. Hold a scored cube to spread the crack. Hold Ctrl and click a scored cube to pop the whole grid. Press Space to make the next cut. Press Enter to pop the whole grid. Press B to blow the small pieces off the mat. Press N to start a new bar. Press 1 to 6 to change the soap." |
| Fail line (line 43) | "Soap cutting needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (line 37) | Stimming No. 12 | Remove. |
| Text on the stage | None | |

### Under Bar v3

- **Focus does not return to the stage** (lines 127 to 130). The toy listens on `.stim-ui` and looks for `.s2-tl, .s2-bl, .s2-br` to hand focus back to the stage after a pointer pick. Bar v3 hides `.stim-ui` and its buttons live in `.sg-ui`, so the listener never runs. After a click on New bar, Blow or a soap tile, focus stays on a `button`; the toy's key guard (line 2688, `closest('button, ...')`) then drops Space and Enter until the user clicks the stage. N, B and 1 to 6 still work: the shell's binder has no button test (`shared/stim.js:386`).
- **The picture keeps a fixed 56 px at the top and the foot** (`fit`, lines 2188 to 2189: `my = Math.min(0.92, 1 - 112 / h)`, comment "The corner rows take about 56 px at the top and the bottom"). It is a constant, not a measure of a Bar v2 part, so it does not go to zero. One Bar v3 row needs 12 + 44 px (46 on touch): it fits, with nothing to spare. A bar that wraps to two rows stands over the front of the mat's landing room. The 56 px at the top now clears only the monogram.
- The bar sits over the front centre of the mat. A press there lands on the bar, so a slice "in from the mat" cannot start there while the bar shows.
- `keys` words the builder cannot draw: `'shift + drag'` and `'ctrl + click'` (line 125). `inputHTML` makes three keycaps of each: "shift", "+", "drag". The `help` list replaces them.
- Known: the key guard names `.s2-sheet` (line 2688); `failed()` calls `ui.hideControls` (line 2706); no `display` is set, so Bar v2 shows a stepper for six options and Bar v3 a pick button with tiles.
- Nothing found: no toy-owned control on the stage, no chip the toy hides, no toggle, no `hold` action, no tray, two actions, no key bound twice.

### Findings

- Enter is bound by the toy (line 2690) and shows nowhere today. The desktop list also omits a click and a hold on a scored cube; both work with a mouse (lines 2625 to 2628, 2585, 2673).
- Blow takes more than shavings: every piece under 40 cells goes, popped cubes too (`isCrumb`, line 2454). The stage label says "blows the shavings away".
- The builder has no drawing for a modifier with a gesture. The two rows above use a keycap and the word "Hold". Neon has the same word (`neon/index.html:142`). Tom's call: a keycap row, or a new drawing in the shell.
- A pop works only on the top of the bar on the board (`h.pc === bar && st.a === 1`, line 2625). Fallen pieces cut but do not pop.
- Space runs a fixed plan of 15 cuts and one pop (`PLAN`, line 1630), then halves the biggest piece at rest, then starts a new bar.
- `failed()` also runs when three.js does not load (lines 2713 to 2715). The fail line then names WebGL for a network fault.
- A comment says a score is "a fixed two cells deep" (line 390); `push` sinks the blade 0.3 cells per cell of travel (`BITE`, lines 1514, 1542). The comment is false.
- Soap cutting has no doc in `docs/toys/`.

### Limits

- Not played, no browser, no server. No real touch screen.
- Not measured: the width of the Bar v3 bar for this toy, so whether it wraps at 375 px is not known.
- "WebGL 2" comes from the three.js version, not from a test in the toy's code.
- The shader, physics and sound code was read only where an input leads into it.
