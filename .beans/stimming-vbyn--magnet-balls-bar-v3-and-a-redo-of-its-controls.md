---
# stimming-vbyn
title: 'Magnet balls: Bar v3 and a redo of its controls'
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

**Magnet balls (`magnet`): review for Bar v3**

Spec: `magnet/index.html:55`. Renderer need: WebGL 2 (three 0.170.0 `WebGLRenderer`, line 1338; see Findings). Read, not played.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| Action | Ring | | R | `makeRing()`: cuts all bonds; the 48 balls go to slots on one ring and snap in order |
| Action | Hex | | H | `makeHex()`: cuts all bonds; the balls pack into a hex-packed sheet that grows from the middle |
| Action | Shuffle (shared verb, with the die) | | S | `scatter()`: cuts all bonds; the balls roll out to an even spread, then loners drift together |
| Settings | Field lines | Off, On (default On, stored) | F (the toy's own handler, line 1303) | `setField()`: shows and hides the field lines on the table |
| Settings | Quality | the site's steps | | `onQuality` re-fits the renderer (line 1016) |
| Settings | Reset | | | `restart()`: three new clumps, as on the first visit |

No list, no slider, no Dev rows.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (H) | Hex | Hexagon | Rule 2: whole words. The key stays H. Open: the shape is a hex-packed sheet of 48, not an exact hexagon; Tom may keep "Hex". |

Kept: Ring; Shuffle (the shared verb); Field lines; Quality; Reset in Settings (nothing in the toy shows or hides it). Settings has fewer than five rows, so no groups.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag a ball | pull a chain | Move a ball |
| Release a ball in motion | (not listed) | Throw the ball |
| Hold the bare table | raise a magnet | Raise a magnet |
| Hold and drag | (not listed) | Move the magnet |
| Double-click a ball | flip or blast | Flip a ball |
| Double-click the bare table | (as above) | Blast the balls apart |
| F | field lines | Show and hide the field lines |
| R | ring (from the action) | Form a ring |
| H | hex (from the action) | Form a hex sheet |
| S | shuffle (from the action) | Shuffle the balls |
| Arrow keys | (not listed; in the stage label only) | Push the nearest cluster |

### The `help` list, ready to paste

```js
help: [['drag', 'Move a ball'], ['release', 'Throw the ball'], ['hold', 'Raise a magnet'], ['hold + drag', 'Move the magnet'],
  ['double-click', 'Flip a ball'], ['double-click', 'Blast the balls apart'], ['F', 'Show and hide the field lines'],
  ['R', 'Form a ring'], ['H', 'Form a hex sheet'], ['S', 'Shuffle the balls'], ['← → ↑ ↓', 'Push the nearest cluster']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (line 44) | Five sentences; two join actions with "or" and commas | "Magnet balls on a table. The balls snap into chains. Drag a ball to move it. Release a ball in motion to throw it. Hold the bare table to raise a magnet. Drag the magnet to pull the balls. Double-click a ball to flip its poles. Double-click the bare table to blast the balls apart. Press F to show and hide the field lines. Press R to form a ring. Press H to form a hex sheet. Press S to shuffle the balls. Press the arrow keys to push the nearest cluster." |
| Fail line (line 45) | "Magnet balls need WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (line 39) | Stimming No. 11 | Remove; the name stays. |

No text on the stage. Title and `h1` "Magnet balls": keep.

### Under Bar v3

- **The table no longer keeps clear of the bar.** `pads(h)` (lines 1034 to 1046) reads `.stim-ui` and the four corner rows `.s2-tl, .s2-tr, .s2-bl, .s2-br` (line 1037), and gives `fit(w, h)` (lines 1047 to 1069) the open band of the stage. `fit` sets the camera distance and the four walls from it; the walls bound the balls, the Ring, the Hex sheet, the Shuffle spots and the first clumps. Under Bar v3 the layer is `display: none` (`shared/stim.css:311`), so each row has `offsetHeight` 0, line 1038 skips it, and `pads` returns the whole stage. The class is set inside `initPage` (`shared/stim.js:201`), before the first `fit`. What the user sees: the table runs to the stage's edges, less the fixed margins `SIDE`, `NEAR`, `FAR` (line 938). Balls roll and rest under the Bar v3 bar at the foot and under the monogram top left. A ball under a bar button cannot be taken; the button takes the press. The camera also comes closer than under Bar v2 on a stage where the height sets the fit, so the balls draw larger.
- The observer on `data-narrow` and `data-stack` (lines 1519 to 1524) re-fits the table when a Bar v2 corner stacks. Nothing tells the toy when the Bar v3 bar wraps to two rows.
- Key guard names `.s2-sheet` (line 1301): known; the shell holds the keys while a sheet is open.
- Shuffle: Bar v3 draws it as a word, without the die.
- Three actions, the limit. None is `hold`, none is a toggle, none opens a list. No toy-owned controls on the stage. No chip that the toy hides. Every `keys` word can be drawn (`drag`, `hold`, `double-click`, `f`).
- The CSS comment on line 25 says "under the Bar v2 corners". A comment only.

### Findings

- The magnet rises on the press, not after a hold: `raise()` runs in `pointerdown` (line 1214) with no delay. A click on the bare table raises it for the length of the click. A short, still press (under 250 ms, `lower()`, line 1196) arms the blast; a second press within 350 ms and 3 ball radii blasts (line 1209).
- A throw is not listed today. A release within 80 ms of the last move keeps the speed (`letGo`, line 1274). A hit faster than `SMASH` knocks the struck ball loose (`smash()`, line 547).
- The arrow keys are listed nowhere on the bar. They push the cluster of the aimed ball: the ball nearest the pointer, else the last ball taken, else the centre ball (`nudge()`, lines 911 to 925). They act only when the table or the page body has focus (line 1310).
- The keyboard can only push. The aim ring shows under keyboard focus (lines 1092, 1295), but no key flips a ball, blasts or raises the magnet. Space and Enter are in `GESTURE_KEYS` (line 148); they only wake the sound.
- F is the toy's own key, not the row's. It sets the Settings row through `ui.setting('field').set()` (line 1305), so the row follows.
- Renderer: the fail line says WebGL. The toy makes a three 0.170.0 `WebGLRenderer`. To my knowledge three dropped WebGL 1 at r163, so the need is WebGL 2. I did not read the library to confirm it.
- `failed()` also shows the fail line when the three import does not load (line 1334). The cause is then the network, not WebGL.
- Reset does not touch Field lines. The toy has no doc in `docs/toys/`.

### Limits

- Read only: no play, no page load, no stills. No real touch screen.
- How far the balls reach under the Bar v3 bar in pixels is not measured; it depends on the stage size.
- Whether the three actions and the system group wrap to two rows on a narrow stage is not checked.
- `shared/signal.js` was read only for the gesture list, the help rows, the actions and the key hold.
