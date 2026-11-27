---
# stimming-vgcj
title: 'Prism: the Signal bar and a redo of its controls'
status: completed
type: task
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Little: the names in the Light stepper.

## Checklist

- [x] List every control and what it does (from the spec, the input code and stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, sheet + copy")
- [x] Switch the toy to the Signal bar: `signal: true` in `prism/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with the new copy and the tray sheet)
- [x] The toy's doc in `docs/toys/` says what is true: Prism has no doc there, so no doc line is false

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, sheet + copy")

The rules are those of the seven toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### The Pieces palette

Prism has its own palette: a boxed tray of eight pieces, tap or drag, that hangs off the + Piece button.

- Fault, fixed: the palette looked for the Bar v2 chip, which Bar v3 hides. It opened in the top left corner, under the monogram, and a second press did not close it. It now hangs off the button that shows (`btn()` in `prism/index.html`).
- Open with Tom: the look. The palette keeps the old bar's look: a box, a hairline, a hard shadow. Bar v3 has no boxes. The proposal: the palette becomes a Bar v3 sheet on the soft glass, with the eight pieces as icon and word in the toy's ink, the white box on the piece under the pointer, and the flash beat on arrival. Tap or drag stays.
- Not done: the bar leaves after 8 s with no input, also while the palette is open.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List | Light: White light, Red laser, Green laser, Violet laser, and one lamp for each element | Keep | A noun; each has its colour dot. |
| Action (A) | + Piece | Keep | The shared add verb. |
| Action (C) | Clear | Keep | The shared verb. |
| Settings | Wireframe | Keep | |
| Settings | Quality; Version: Classic; Reset | Keep | |
| Palette, heading | Pieces, with the hint "tap or drag" | Pieces, with the hint "Click or drag"; "Tap or drag" on touch | The word for the input on that screen. |

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | move | Move a piece |
| Drag | turn, as "drag ring" | Turn a piece by its ring |
| Scroll | size, zoom | Change the size of a piece |
| Scroll | (as above) | Zoom the view |
| Double-click | (not listed) | Reset the view |
| Tab | (not listed) | Select the next piece |
| Arrows | (not listed) | Move the piece |
| Q and E | (not listed) | Turn the piece |
| + and - | (not listed) | Change the size of the piece |
| Delete | remove | Remove the piece |
| Escape | (not listed) | Release the piece |
| 0 | (not listed) | Reset the view |
| A | + piece | Add a piece |
| C | clear | Clear the table |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | Six long sentences | "A black table. A white lamp shines through a prism. The light fans into a spectrum. Add prisms, lenses, mirrors and sensor pads from the Pieces tray. Drag a piece to move it. Drag its ring to turn it. Scroll on a piece to change its size. Press Tab to select a piece. Press the arrow keys to move it. Press Q and E to turn it. Press plus and minus to change its size. Press Delete to remove it. Press Escape to release it." |
| Line when the toy cannot run | "Prism needs WebGL2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name | Stimming No. 07 | Remove; the intro shows no number. |

### Findings

- Prism has two more parts of its own in the old look: the round Remove button on a piece and a zoom chip. Neither is reviewed yet.
- Shift and a drag also turns a piece; two fingers twist it on touch. The help has one row for the turn.
- Prism has no doc in `docs/toys/`.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen. The drag of a piece out of the palette is not tested under Bar v3.

## Applied on 2026-11-17

Tom: "Yes, sheet + copy".

The Pieces palette is a Bar v3 sheet:

- A bar action may carry a tray: `tray: { title, hint, touchHint, options, onPick }` (`shared/stim.js`, the type; `shared/signal.js`, `actionParts`). Bar v3 opens the options in a sheet: no box, the soft glass, the flash beat, the white box under the pointer.
- The action's handle gets `tray.open(on)` and `tray.isOpen`. Prism's `palette.toggle()` and `palette.close()` use them, so the A key and the end of a carry act on the sheet.
- A drag from an option carries the piece out. In the carry the sheet and the glass step aside (`html[data-carry]` in `prism/index.html`), so the table is clear.
- Bar v2 keeps the boxed palette; it shows with `?bar=v2`.

Checked on the real page at 1280 px: a press on + Piece opens the sheet; a click on Convex lens adds the lens and shuts the sheet; a second press shuts it; A opens it; Escape shuts it; a drag of Mirror out of the sheet places a mirror and shuts the sheet. The console is clean.

One row more than the proposal: a drag on the bare table moves the view ("Move the view").

Not done: the round Remove button on a piece and the zoom chip keep the old look. The drag out of the sheet is not checked on a real touch screen.
