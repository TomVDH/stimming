---
# stimming-fv3b
title: 'Pendulum wave: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T21:23:03Z
updated_at: 2026-11-27T07:19:52Z
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

**Pendulum wave (`pendulum`): review for Bar v3**

Spec: `pendulum/index.html:81`. Renderer need: WebGL 2 (three 0.170 `WebGLRenderer`; the trail shader uses `texelFetch`, line 471). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Pendulums | 12, 20, 32 | none | `setCount`: the row retracts, the new row drops in. Stored as `stimming.pendulum.count`. |
| Action | Release, with a glyph of the next pattern | | Space | `release()`: the row rises to a pattern (line, ramp, zip, wave, in turn), then lets go after 1.05 s. No effect during a count change. |
| Action | Stop | | Escape | `stop()`: a brake eases every ball to rest. Off unless the row swings or lifts (`showStop`, line 1122). |
| Action | Iso, with a cube icon | | V | `setView`: swaps the perspective camera for a fixed isometric one. A toggle; stored as `stimming.pendulum.view`. |
| Settings | Quality | Standard, High | | The shell's row (`quality: true`). |
| Stage | drag a ball | | | Pointer down on a ball holds it on a spring; the let-go swings it (`grab`, `endDrag`). |
| Stage | drag across | | | `sweep`: each string the pointer crosses is caught; its ball rises to the pointer's height. |
| Stage | hold | | Shift | `warpTo`: time runs up to 6x (3x with reduced motion) after 120 ms, only while no ball is held. It slows as the row lines up. |

No slider, no Settings rows of its own, no Reset, no Dev. Sound: on in `toys.json`.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (V) | Iso | Isometric | No abbreviation. The chip's own `aria-label` already says "Isometric view" (line 95). |
| Action (Space) | Release, with the pattern glyph in the label | Release as a plain word; the glyph is open with Tom | The glyph has no life on Bar v3 (see Under Bar v3). |

Kept: Pendulums (12, 20, 32); Release; Stop; Quality.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | drag a ball: swing it | Swing a ball |
| Drag | drag across: lift a row | Lift balls by their strings |
| Hold | hold / shift: rush time | Rush time |
| Shift | (in the row above) | Hold to rush time |
| Space | release (from the action) | Release the row |
| Escape | stop (from the action) | Stop the row |
| V | iso (from the action) | Switch the isometric view on and off |

### The `help` list, ready to paste

help: [['drag', 'Swing a ball'], ['drag', 'Lift balls by their strings'], ['hold', 'Rush time'], ['shift', 'Hold to rush time'], ['space', 'Release the row'], ['esc', 'Stop the row'], ['V', 'Switch the isometric view on and off']],

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (line 60) | "Pendulum wave. Drag a ball to swing it, or drag across the strings to lift a row. Hold the stage or Shift to rush time. Space releases the row, Escape stops it, V swaps the view." | "A row of pendulums on a beam. Each ball swings at its own pace. Drag a ball to swing it. Drag across the strings to lift the balls. Hold the stage to rush time. Hold Shift to rush time. Press Space to release the row. Press Escape to stop the row. Press V to switch the isometric view on and off." |
| Fail line (line 62) | "Pendulum wave needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro | Name only; no `intro-sub` | Keep |
| Warp tag on the stage | "6.0×" (a number, `aria-hidden`) | Keep |
| Iso chip `aria-label` (line 95) | "Isometric view" | Not needed when the label is "Isometric" |

### Under Bar v3

- **The toy measures Bar v2 to frame the row.** `layer` and `corners()` (lines 518-519) read `.stim-ui` and `.s2-tl, .s2-tr, .s2-bl, .s2-br`; `bands()` (773-786) adds `.s2-keys`; `fit()` (796-806) turns the two bands into `yHi` and `yLo`. Under Bar v3 the layer is `display: none` (`shared/stim.css:311`), so both bands are 0. Then `yLo` is -0.9: the lowest ball may hang 5% of the stage height above the foot (40 px on an 800 px stage, 20 px on 400 px). The Bar v3 bar stands from 12 px to 56 px above the foot (`shared/signal.css:84`, `--h` 44 px). So on a wide, low stage the long pendulums can sit under the bar. At the top the beam may run to 6% from the edge, level with the monogram. Nothing in the toy reads `.sg-bar` or `.sg-mono`.
- **The observers go quiet.** Lines 1253-1260 watch the corner rows, `.s2-keys` and `data-narrow`, `data-stack`, `data-tight`. None of these changes under Bar v3, so a bar on two rows does not refit the row.
- **The Iso button does not show its state.** The toy sets `aria-pressed` on its Bar v2 chip (lines 1132, 1137). Bar v3 finds that chip by its label text (`shared/signal.js:246`): the chip's text is "Iso", but `actLabel` gives the whole label with its SVG markup, so no chip matches and the button loses `aria-pressed` (lines 250-251). The same miss holds for Release. Stop matches, and its off state goes through the handle, so it works. A plain-word label makes the match.
- **The next-pattern glyph is empty.** `showPattern()` (198-207) writes its bars into `relBtn`, the hidden chip (line 91). The Bar v3 button holds its own copy of the empty `<svg class="pat">`, 18 px wide by `.sg-btn svg`: a blank gap before "Release". The `aria-label` "Release, line pattern" also stays on the hidden chip.
- **The cube loses its look.** The toy's `.pat` and `.cube` rules name `.s2-chip` (lines 34-38). On Bar v3 the cube takes `.sg-btn svg`: no fill, a 1.75 stroke.
- **The warp tag hangs off Bar v2.** `placeWarp()` (788-794) reads the top corners. With zero sizes it lands at 8 px from the top, centred. It is a toy-owned solid white tag with a 2 px radius (lines 41-49).
- `stopBtn.querySelector('.s2-kbd').textContent = 'Esc'` (line 94) writes to the hidden chip: no effect.
- `'hold / shift'` in `keys` (line 89): the builder draws a hold with "/ shift" as small text, no keycap. The `help` list replaces it. Shift is bound by the toy (lines 1113-1119), not by the spec; its guard names no sheet, and the shell holds it while a sheet is open. No key is bound twice. Three actions, no `hold`, no tray, no option icon or dot.

### Findings

- No Reset. Count and view are stored; the pattern order restarts only on a reload.
- `failed()` (line 1142) shows the line only. It does not call `ui.hideControls()`, so the bar keeps every control on a dead stage.
- The fail line also shows when the three import fails (line 1181), which is a network fault, not a WebGL one.
- Release changes its pattern on each press, and only the glyph says which comes next. With a plain word, nothing says it.
- "Swing a ball" is the toy's verb; the shared word for a drag on a thing is "Move a ball". Tom picks.
- "Hold the stage" is true only away from the strings: a press on a string catches it, and a held ball stops the rush (`warpTo`, line 922).
- Stop's key is Escape. Under Bar v3 Escape with a sheet open closes the sheet and does not stop the row.
- Pendulum wave has no doc in `docs/toys/`.

### Limits

- Not played, not opened in a browser, no stills. The overlap with the bar is from the numbers in `fit()` and `signal.css`, not from a look.
- No real touch screen. The touch forms of the help rows are from `inputHTML` only.
- Not checked: whether Space on a focused Bar v3 button both presses that button and fires Release.
- I did not read all of `shared/signal.js` or `shared/stim.js`; only the parts named above.
