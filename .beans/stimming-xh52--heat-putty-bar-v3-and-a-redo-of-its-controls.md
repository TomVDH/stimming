---
# stimming-xh52
title: 'Heat putty: Bar v3 and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T21:23:04Z
updated_at: 2026-11-17T21:23:04Z
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

**Heat putty (`putty`): review for Bar v3**

Spec: `putty/index.html:76`. Renderer need: WebGL 2, with the `EXT_color_buffer_float` extension (`:86`, `:88`). Read, not played.

The one edit is made: `signal: true` at `putty/index.html:76`. Nothing below is applied.

### Today

| Where | Label | Options | Key | What it does (from the code) |
|---|---|---|---|---|
| List (choice) | Putty | Violet, Teal, Noir; each has a `dot` (`:73`) | 1, 2, 3 | `act.pick` (`:590`): `setPutty` sets the cold colour, the hot colour and the table colour, then draws. The slab and its heat stay. The toy stores the pick itself as `stimming.putty.putty` (`:67`, `:592`). |
| Action | Clear | | C | `act.clear` (`:595`): `knead()` makes a fresh, cold slab. The button goes off until the next press on the putty (`:556`, `:596`). |
| Slider | None | | | |
| Settings | Quality | The site's steps | | `onQuality(fit)` (`:601`): a new canvas size. |
| Settings | Version | Classic (`toys.json` has `legacy: true`) | | The shell adds it. |
| System | Sound | | | `toys.json` has `sound: true`. A squish on a press, a squelch on a handprint, a rub noise in a drag (`:507` to `:527`). |
| Settings | Reset | None (`reset:` is not in the spec) | | |
| Dev | None | | | |

Inputs on the stage (the canvas, `:554` to `:588`). The toy has no key handler and no wheel handler of its own.

| Input | What it does |
|---|---|
| Press | The fingertip makes a dent and warms the spot (`SIM`, `:171` to `:190`). Only one pointer counts (`:555`). |
| Drag | The putty moves with the finger. A fast drag adds friction heat. Warm putty shows the hot colour and cools back (`:163`). |
| Hold still for 450 ms, inside 7 px | A handprint: the outline of a hand presses down and warms (`:417`, `:193` to `:205`). A move of more than 7 px lifts the hand and the drag goes on (`:576`). |

### Controls

No row changes.

Kept: Putty (a noun; Violet, Teal, Noir are names); Clear on the bar (rule 7); Quality; Version.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | smear | Smear the putty |
| Click | (not listed) | Press a dent |
| Hold | handprint | Press a handprint |
| 1, 2, 3 | putty | Change the putty |
| C | clear | Clear the putty |

Notes on the words:

- "Clear the putty" follows "Clear the table". "Clear the slab" is the other choice; "slab" is the code's word and shows nowhere on the page.
- "Change the putty" is the stage label's own verb today ("Keys 1 to 3 change the putty").
- The Click row is from the shader's numbers, not from play: about 0.1 s of contact brings the centre past the colour threshold (`:189`, `T0` at `:96`). Tom may drop the row if a click shows too little.

### The `help` list, ready to paste

```js
help: [['drag', 'Smear the putty'], ['click', 'Press a dent'], ['hold', 'Press a handprint'], ['1 2 3', 'Change the putty'], ['C', 'Clear the putty']],
```

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage `aria-label` (`:41`) | "A bar of heat-sensitive putty. Drag to push and smear it; the warm trail changes colour and cools back slowly. Hold still to press a handprint. Keys 1 to 3 change the putty; C clears it." | "A bar of heat-sensitive putty on a table. Drag to smear the putty. The warm trail changes colour. It cools back slowly. Click to press a dent. Hold still to press a handprint. Press 1 to 3 to change the putty. Press C to clear the putty." |
| Fail line (`:43`) | "Heat putty needs WebGL 2 with float textures, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro (`:36`) | `intro-sub`: "Stimming No. 18" | Remove. "Heat putty" stays. |

### Under Bar v3

1. **The slab no longer keeps clear of the bar. This is the one that needs a fix in the toy.** `fit()` (`:383` to `:402`) reads the Bar v2 corner rows: `layer.querySelectorAll(':scope > :is(.s2-tl, .s2-tr, .s2-bl, .s2-br)')` filtered on `el.offsetParent` (`:389`), with `layer = document.querySelector('.stim-ui')` (`:85`). Under Bar v3 that layer is `display: none` (`shared/stim.css:311`), so the list is empty, `top` is 0 and `foot` is the stage height (`:390`, `:391`). The slab then takes the whole stage less a margin of 14 to 40 px (`:386`, `:394`, `:395`). From the code, the user sees: the monogram (12 px in, 44 px tall, `shared/signal.css:193`) stands on the slab's top left corner, and the bar (12 px up, 44 px or more, `shared/signal.css:84`) stands on the slab's lower edge. Both take the pointer (`.sg-ui > * { pointer-events: auto }`, `shared/signal.css:19`), so a press cannot start on the putty under them. A drag that starts elsewhere still passes under (pointer capture, `:557`). Under Bar v2 the slab kept a 10 px gap (`:392`). Bar v3 gives its height as `--barh` on its layer (`shared/signal.js:562`).
2. **The refit watches Bar v2 parts only.** `:600` puts a `ResizeObserver` on each `div` of `.stim-ui`. Hidden parts do not fire. A Bar v3 bar that wraps to two rows starts no refit. This is the hook a fix for item 1 needs.
3. **Keys 1, 2, 3 show twice in How to play until `help` is in.** The builder draws the `keys` row `['1 2 3', 'putty']` (`shared/signal.js:401`) and then one row for each option key (`:406`). The `help` list above ends it.
4. **Dots.** Each option's `dot` is a `linear-gradient` of the cold colour over the hot (`:73`). `optHTML` writes it as `background:` (`shared/signal.js:115`), which takes a gradient. Not seen on the page.
5. **Clear goes off and on.** The toy sets `ui.action('clear').disabled`, not `hidden`. Bar v3 mirrors it at 40% (`shared/signal.js:248`). No gap found.
6. **A failed toy.** `fail()` calls `ui.hideControls()` (`:87`); the shell reads the mark. Known.
7. Nothing found for: a `.s2-sheet` key guard, toy-owned controls on the stage, text that names a Bar v2 place, a `hold` action, a tray, a `display:` word, Shuffle, a key bound twice. All four `keys` words can be drawn.

### Findings

- No Reset. Clear makes a fresh slab, and the putty pick is the only other state. A Reset in Settings would do the same as Clear. Tom's call.
- The fixed fail line names WebGL 2 only. The toy also fails with WebGL 2 on and no `EXT_color_buffer_float` (`:88`), and on a shader that does not compile (`:321`).
- No keyboard play. The stage takes focus (`tabindex="0"`, `role="application"`, `:41`) but only 1, 2, 3 and C act.
- A second finger does nothing (`if (F.down) return`, `:555`).
- Reduced motion cools the putty eight times faster after release (`:424`). No control shows it.
- No doc in `docs/toys/`.

### Limits

- Not played, no page opened. The overlap in item 1 is from the code and the CSS, not from a still.
- `shared/stim.js` and `shared/signal.js` are read only where the toy meets them (action handles, option keys, the help builder).
- `putty/legacy.html` is not read. No real touch screen.
