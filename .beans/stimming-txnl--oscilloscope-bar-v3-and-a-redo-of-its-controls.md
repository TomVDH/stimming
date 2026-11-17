---
# stimming-txnl
title: 'Oscilloscope: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:30:26Z
updated_at: 2026-11-17T21:30:26Z
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

**Oscilloscope (`scope`): review for Bar v3**

Spec: `scope/index.html:78`. Renderer need: WebGL 2. Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Mode | Pen, Knot | none | `act.mode`: Pen plays a drawn shape; Knot plays two sine waves in a ratio |
| Slider | Pitch | 0 to 1000, a log scale for 40 to 400 Hz | Up, Down on the stage | `setPitch`: laps per second; the arrows step one semitone (`stepPitch`) |
| Action | Shuffle | | S | `shuffle`: Pen takes one of seven shapes (cube, star, trefoil, spring, heart, pyramid, bolt); Knot takes a new ratio |
| Action | Clear | | C | `clear`: removes the shape or the knot; off while the face is empty (`changed`, line 366) |
| Settings | Quality | Standard, High | | `onQuality(layout)`: the canvas budget |
| Settings | Reset | | | `resetAll`: the cube, Pen, 110 Hz, green phosphor, spin on |
| Stage tag | SPIN ON / OFF | | Space | `toggleSpin`: stops and starts the turn; does nothing under reduced motion |
| Stage tag | P31 GREEN, P7 RADAR, P3 AMBER, P4 WHITE | | P | `nextPhosphor`: the next of four; stored as `stimming.scope.phosphor` |
| Stage tag | SOUND OFF · TAP | | | `sound.set(true)`; shows only while muted |
| Stage | Drag | | | Pen: draws a stroke; a closed stroke becomes a solid, an open one a ribbon (`fromStroke`). Knot: picks a cell of a five by five grid (`pick`) |

No Dev rows. No wheel, double-click or right-click handler.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| (none) | | | Every label is a noun or one verb, and Reset is already in Settings. |

Kept: Mode (Pen, Knot), Pitch, Shuffle, Clear, Quality, Reset.

### How to play

`keys: false` today, so the toy shows no list. The screen draws keycaps for Space, P and the arrows; S and C show only on the Bar v2 chips.

| Input | Have | Suggested |
|---|---|---|
| Drag, Pen | "DRAG ANYWHERE TO DRAW" (stage hint) | Draw a shape |
| Drag, Knot | "DRAG ACROSS THE GRID TO TIE A KNOT" (stage hint) | Tie a knot |
| Click, Knot | (not listed) | Tie a knot |
| Up, Down | keycaps on the screen | Change the pitch |
| Space | keycap on the screen | Switch the spin on and off |
| P | keycap on the screen | Change the phosphor |
| S | on the chip | Shuffle the shape |
| C | on the chip | Clear the screen |

### The `help` list, ready to paste

```js
help: [['drag', 'Draw a shape'], ['drag', 'Tie a knot'], ['click', 'Tie a knot'], ['↑ ↓', 'Change the pitch'],
  ['space', 'Switch the spin on and off'], ['P', 'Change the phosphor'], ['S', 'Shuffle the shape'], ['C', 'Clear the screen']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label | Five long sentences (line 39) | "An oscilloscope screen. A beam draws a shape. The shape plays as a stereo tone. Drag in Pen mode to draw a shape. Drag in Knot mode to tie a knot. Press the up and down arrow keys to change the pitch. Press Space to switch the spin on and off. Press P to change the phosphor. Press S to shuffle the shape. Press C to clear the screen." |
| Fail line | "Oscilloscope needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name | Stimming No. 19 | Remove |
| Stage tag, muted | "♪ SOUND OFF · TAP" on every screen | "♪ SOUND OFF · CLICK" on a mouse screen; TAP on touch (`FINE.matches` is there already) |
| Stage hints | "▸ DRAG ANYWHERE TO DRAW", "▸ DRAG ACROSS THE GRID TO TIE A KNOT" | Keep |
| Tag labels | "Turn sound on", "Spin", "Change the phosphor" | Keep |

### Under Bar v3

- MEASURES Bar v2: `corners()` (lines 799-809) reads `.s2-tl`, `.s2-tr`, `.s2-bl`, `.s2-br` inside `.stim-ui` (line 96) and skips a child with no `offsetParent`. Under Bar v3 every child is skipped, so `top` and `bot` are 0. `layout()` (lines 810-822) then sets `hudTop` to 18 and puts the foot of the face 12 to 20 px from the foot of the stage.
  - Top left: the PEN / KNOT readout draws at x 18, y 18 (`paintHud`, line 730). The monogram is a 40 px white square at 12, 12 (`signal.css:193-199`), so it covers the readout. On a small face the SPIN tag starts at y 43 (line 739) and its start is under the square too; the monogram, in the layer above, takes that click.
  - Foot: the bar is 44 px tall at 12 px from the foot (`signal.css:84-86`). The foot of the face, its two lower corner brackets and the Knot grid's lower number row (line 719) run behind the bar where the bar has parts. A press there goes to the bar, so the lowest Knot row and the foot of a drawing are hard to reach in the middle.
  - A bar on two rows is taller; the toy does not follow `--barh`.
- No How to play button: `keys: false` and no `help`, so `signal.js:390` adds none. The `help` list above brings it.
- `document.querySelector('.stim-ui .s2-slider input')` (line 1099): the toy writes `aria-valuetext` ("110 hertz, A2") on the Bar v2 input. The Bar v3 slider (`rangePart`, `signal.js:195`) is a new input and gets no such text.
- Lines 1195-1199: a `ResizeObserver` on the Bar v2 corners and a `MutationObserver` on `data-narrow`, `data-stack`, `data-tight`. Under Bar v3 they have nothing to report; no harm.
- Key guard names `.s2-sheet` (line 1171): no longer a fault.
- `fail()` calls `ui.hideControls()` (line 99): the shell reads the mark at its draw.
- Shuffle: Bar v3 draws it as a word. Clear's off state: Bar v3 mirrors it.
- Two actions, no hold, no tray, no icon, no dot. No chip is hidden by the toy. No key is bound twice: the shell has S and C; the toy has the arrows, Space and P (lines 1169-1176), none in the spec.

### Findings

- The screen draws its own keycaps (SPACE, P, ↑, ↓; `keycap`, lines 745-763). The Bar v3 spec says keycaps show only in How to play. Tom's call: keep them as the toy's own legend, or drop them once the help list is in.
- Spin and the phosphor have no row on the bar or in Settings. They live only as tags on the screen, top left, where the monogram now sits.
- The sound tag on the screen does the same as the bar's Sound button, one way only (on).
- The arrows act only while the stage has focus (line 1173). After a press on a bar button they do nothing until the next click on the screen. P and Space act from anywhere.
- A click with no drag does nothing in Pen (a stroke needs 0.3 divisions, line 1090). In Knot a press alone picks (line 1070); the hint says only "drag".
- Under reduced motion Space does nothing and the tag reads "SPIN —"; the help row stays.
- Reset also sets the stored phosphor back to green.
- Oscilloscope has no doc in `docs/toys/`.

### Limits

- A read of the page and of `shared/signal.js` and `signal.css`. No play, no browser, no stills.
- The overlaps under Bar v3 are worked out from the numbers in the code, not seen. The bar's real width, and so how much of the face it covers, is not measured.
- Touch is not checked: the tags' hit boxes, the drag on a phone, the wrapped bar.
- The sound path (`sync`, `penWave`, `knotWave`) is read only for what the controls do.
