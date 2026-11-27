---
# stimming-vz8v
title: 'Morpher: Bar v3 and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T20:39:26Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-a5rs
---

One of the 77 toys that follow the first ten (Tom, 2026-11-17: "also proceed with all the toys -- subagetns for all -- per 5"; epic stimming-a5rs).
A subagent read the toy and wrote this review; it did not play the toy. The toy's one code change is `signal: true`.

## Checklist

- [x] Switch the toy to Bar v3 (`signal: true`)
- [x] Review every control, label, help row and line of copy, as a proposal
- [x] Tom rules on the proposal (2026-11-17: "Yes, apply all")
- [x] Apply the copy and the fixes under "Under Bar v3" (2026-11-17, by a subagent; its report names what it left and Tom's calls)
- [x] 1280 px, 375 x 812 and 812 x 375 on the real page; clean console (2026-11-17, after the apply)
- [ ] The toy's doc in `docs/toys/` says what is true

## The review (proposal; no word is changed)

**Morpher (`morpher`): review for Bar v3**

Spec: `morpher/index.html:153`. Renderer need: WebGL 2 (three.js 0.170.0 `WebGLRenderer`, line 851; the shader uses `vec2[7](...)`, line 279, which is GLSL ES 3.00). Read, not played.

The one edit: `signal: true` in the `initPage` call (`morpher/index.html:153`). Nothing else changed. Plain HTML and JS; no build.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List | Shape | Auto, Circle, Triangle, Square, Pentagon, Hexagon, Star, Flower, Heart, Moon, Cross, Ring, Diamond. `display: 'stepper'`. The twelve forms carry a line icon; Auto has none. | none | `choose` (453). A form sets the target and holds it. Auto roams eight other forms (gear, burst, clover, bean, bolt, drop, wobble, smiley: `AUTO`, 121), a new one each 2.8 s (`HOLD`, 401; line 679). Starts on Auto. Under reduced motion the page starts on Circle (412), and Auto morphs once and rests (456). Not stored. |
| Slider | Blend | 0.02 to 0.3, step 0.01, starts at 0.14 | none | Sets `uK` (155): the width of the smooth bridge between the shape and the blobs (377 to 378). Blobs among themselves use 0.7 of it (364). Not stored. |
| Action | Clear | | C | `clear` (465): removes every blob. Switched off while there is no blob (`showClear`, 461; line 160). |
| Settings | Quality | Standard, High | none | The site's row (`quality: true`, 157). A change re-fits the renderer (833). |
| Dev | none | | | |
| Sound | none | | | `silent: true`: the shell hides the sound button. |
| Key strip | click: drop. drag: throw. drag the shape: stretch. arrows + space: aim and drop. | | | `keys`, line 158. |

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List, first option | Auto | Changing | The shared word for an option that moves by itself (Weather: "Changing"). "Auto" is a short form, not a whole word. The value `'auto'` stays, so no code path changes. Open for Tom: Railgun keeps "Auto" in Settings for another meaning (the toy aims for you). |

Kept: Shape; the twelve form names; Blend (the page's own text explains it, line 54); Clear, on the bar; Quality.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Move | (not listed) | Move the aim |
| Click | drop | Add a blob |
| Drag | throw | Throw a blob |
| Drag, from the shape | stretch, as "drag the shape" | Stretch the shape |
| Arrow keys | aim and drop, as "arrows + space" | Move the aim |
| Shift and the arrow keys | (not listed) | Move the aim in large steps |
| Space | (in "arrows + space") | Add a blob |
| C | clear (the action's key) | Clear the panel |

Notes on the words:

- "Add a blob" is the shared add verb. "Drop" is not plainly the toy's own verb: the blobs do not fall, they circle the shape (635 to 640).
- "Throw" stays: it is a second action with its own result (the blob leaves with the pointer's speed, 528).
- "Aim" is the word the page uses today (stage label, key strip). The code calls the same thing the pip (30, 401). The help uses one word for it on the pointer and on the keys.
- "Panel" is the place word in the code's comments (23, 641). It shows nowhere on the page today. Tom may want another place word.

### The `help` list, ready to paste

```js
help: [['move', 'Move the aim'], ['click', 'Add a blob'], ['drag', 'Throw a blob'], ['drag', 'Stretch the shape'],
  ['← → ↑ ↓', 'Move the aim'], ['shift ← → ↑ ↓', 'Move the aim in large steps'], ['space', 'Add a blob'], ['C', 'Clear the panel']],
```

With `help` in the spec the builder adds no action keys by itself (`shared/signal.js:394`), so the C row is in the list.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers (43) | "A shape that melts from one form into the next. Shape picks a form, or Auto to roam. Click to drop a blob, drag to throw one, drag the shape to stretch it. Arrow keys move the aim, Space drops a blob there, C clears the blobs." | "A shape on a dark panel. It melts from one form into the next. A small blob marks the aim. Move the pointer to move the aim. Click to add a blob. Drag to throw a blob. Drag the shape to stretch it. A blob circles the shape. Then it melts into the shape. Press the arrow keys to move the aim. Press Space to add a blob. Press C to clear the panel." |
| Line when the toy cannot run (45) | "Morpher needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name (38) | Stimming No. 01 | Remove; the name stays. |

The suggested stage label drops "Shape picks a form, or Auto to roam": it names a bar control, and the control has its own label. There is no other text on the stage.

### Under Bar v3

1. **The toy reads a Bar v2 part.** `morpher/index.html:560`: `if (e.target.closest?.('input, textarea, select, [contenteditable], .s2-sheet')) return;`. Under Bar v3 the sheets are `.sg-sheet`, so this guard no longer covers an open sheet. A press with focus on a Bar v3 button, link or slider is still safe (the `input` test on 560; the `button, a` tests on 563 and 569). The gap: Bar v2 moved focus into an open sheet (`shared/stim.js:364`), Bar v3 does not. With a sheet open and focus on the page body or the stage, Space adds a blob and the arrows move the aim. Not seen on a page.
2. **A `keys` word the builder cannot draw.** Line 158: `['arrows + space', 'aim and drop']`. Without `help`, `inputHTML` (`shared/signal.js:82`) draws three keycaps: "arrows", "+", "space". The help list above removes the fault.
3. **`display: 'stepper'` is not read.** Line 154. Bar v3 never reads `display`: thirteen options give a pick button that opens a list of thirteen tiles (`shared/signal.js:318` to 323). Under Bar v2 one press on an arrow went to the next form, and the arrow keys stepped the focused stepper (`shared/stim.js:410` to 416, 446). Under Bar v3 a change of form is two presses, and there is no step by key. Needs Tom's look.
4. **Option icons.** Twelve options carry an `icon` (line art, no fill, line 151). `isArt` is false for them, so they draw as outlines in the accent ink (`shared/signal.css:34`). Auto has no icon: its tile and the pick button show the word alone, the twelve others show icon and word. No option has a `dot`.
5. **Clear is switched off, not hidden.** Lines 160 and 463 set `disabled`. Bar v3 follows it (`shared/signal.js:247`; 40%, `shared/signal.css:44`). No gap found.
6. **The hidden cursor.** Line 31: `.stage--morpher.live { cursor: none; }`. The Bar v3 layer is a sibling of the stage (`shared/stim.js:713` to 715, `shared/signal.js:135`), so the rule does not reach it. Over the bar the browser's cursor shows and the pip leaves (`pointerleave`, 535). Nothing breaks in the code. Not seen on a page.
7. **The page that cannot run.** `failed()` (837) calls `ui.hideControls()`, which marks the Bar v2 layer `data-bare`. Bar v3 copies that mark only in its observer callback (`shared/signal.js:583`), not in `draw`. If `failed()` runs before `mountSignal` attaches the observer, the Bar v3 bar can stay on a page that shows the fail line. The order is not settled by a read. The code is in `shared/`, not in the toy.
8. Nothing found for: more than three actions (there is one); `hold: true`; a toy-owned list, palette, tray, chip or cue; a round button on the stage; a chip the toy hides; a key bound twice; stage text that names a Bar v2 place.

### Findings

- **Auto shows forms that the list never offers.** `nextAuto` (441) draws only from `AUTO` (121): eight forms with no name and no icon. The twelve named forms never appear under Auto. The comment on line 119 says this is on purpose. The label may read as "step through this list"; it does not do that.
- **The grab test is a circle, not the shape.** A press within 0.3 units of the stage centre grabs the shape (`GRAB_R`, 418; line 516). So a press in the hole of Ring or in the notch of Moon also stretches, and a press on a part of a form beyond 0.3 (the tips of Star, 0.34, line 325) starts a throw.
- **A click on the shape adds a blob.** Only a press on the shape that moves more than 0.02 units stretches it (524 to 529).
- **The pip wears the colour of the next blob** (`uPC`, 630). The help does not say so.
- **Space and the arrows are bound on the window** (558), not on the stage. They act while the stage is in view and focus is not in a field, on a button or on a link. Space does not repeat (565); the arrows do.
- **At most 24 blobs.** Past that the oldest shrinks away (`MAXB`, 401; line 503).
- **No Reset.** The spec has no `reset:`. Shape and Blend are not stored, so a reload is the reset. Clear covers the blobs. No Reset is proposed here.
- **The fail line can name the wrong cause.** `failed()` also runs when three.js does not load from the CDN (844 to 848).
- **The page's text names the slider.** Line 54: "*Blend* sets how wide that bridge can grow." A new name for Blend makes this line false.
- **A click on the stage with a sheet open** closes the sheet (`shared/signal.js:573`) and also adds a blob (511 to 533). Bar v2 did the same (`shared/stim.js:344`).
- **On a touch screen the move row and the two drag rows show the same drawing** (`TOUCH`, `shared/signal.js:71`). On touch the pip shows only while a finger is down (531), so a move of the aim there is a drag that throws a blob on release. The builder has no way to drop a row on touch alone when its word is a pointer word.
- **No doc.** There is no `docs/toys/morpher.md`.
- `morpher/lab.html` exists. It has no `initPage` call and no Bar v2 class name (a search, not a read).
- With the help list applied, the `keys` entry on line 158 still feeds the hidden Bar v2 strip and `?bar=v2`.

### Limits

- Not played. No server, no browser, no screenshot: the brief forbids them. The `signal: true` edit is not checked on a page.
- No touch screen. The narrow layout (under 640 px) and the short landscape layout are not seen; whether the bar at the foot covers part of the shape there is not known.
- That three.js 0.170.0 needs WebGL 2 comes from knowledge of three.js, not from this repo. The shader's GLSL ES 3.00 array constructor (279) is read in the code.
- `morpher/lab.html` is not read.
- The contour figure and its `aria-label` (57) are outside the stage and are not reviewed.
