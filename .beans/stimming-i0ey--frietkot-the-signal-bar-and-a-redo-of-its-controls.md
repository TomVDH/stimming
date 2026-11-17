---
# stimming-i0ey
title: 'Frietkot: the Signal bar and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T08:54:09Z
updated_at: 2026-11-17T08:54:09Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Nothing sits on the bar: decide whether one of its six rows belongs there.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, both"): Weather on the bar, and the copy
- [x] Switch the toy to the Signal bar: `signal: true` in `frietkot/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with Weather on the bar and the new copy)
- [x] The toy's doc in `docs/toys/` says what is true: Frietkot has no doc there, so no doc line is false

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, both")

The rules are those of the nine toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### The bar

The bar holds three icons and no word: Sound, Settings, How to play. The first read asked whether one of the six rows belongs on the bar.

Proposal: Weather goes on the bar as the toy's list. It is the row with the largest effect on the picture, and Train ride has its weather on the bar. The other five rows stay in Settings.

The cost named in the proposal did not come: the bar's list does not store its pick, so the toy stores it under the row's old key (`stimming.frietkot.weather`, the same values). A pick made before the change stays.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Weather | In Settings: Shifting, Dry, Drizzle, Rain, Fog | On the bar: Changing, Dry, Drizzle, Rain, Fog | Train ride's word for weather that moves by itself is "change". |
| Settings | Sign: Neon, Lit board, Lightbox | Keep | |
| Settings | Neon: Red, Blue, Green | Neon colour: Red, Blue, Green | Neon is also a kind of Sign. This row colours the neon tube on the shack, with any sign. |
| Settings | Traffic | Keep | |
| Settings | Tilt-shift | Keep | |
| Settings | Camcorder | Keep | |
| Settings | no headings | Place: Sign, Neon colour, Traffic. Lens: Tilt-shift, Camcorder | The code's own comment gives the order: the night, the place, the lens. |
| Settings | Quality, Reset | Keep | |

### How to play

| Input | Have | Suggested |
|---|---|---|
| Drag | look round | Look around |
| Scroll (pinch on touch) | zoom | Zoom the view |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | "A chip shack alone on a dark village square at night. Its service window glows; the staff fry and serve on their own. Drag to look round." | "A chip shack on a dark village square at night. Its window glows. The staff fry and serve by themselves. Drag to look around. Scroll to zoom the view." |
| Line when the toy cannot run | "Frietkot needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name | Stimming No. 39 | Remove; the intro shows no number. |
| Opening title on the stage | Vrijdagavond / Op 't kerkplein | Keep; it is Tom's. |

### Findings

- The code still has a press box for the shack and a comment "A hold on the shack shakes the basket". Nothing acts on a tap or a hold now: the fryer runs by itself.
- On 812 x 375 the Settings sheet scrolls; it has eight rows.
- Frietkot has no doc in `docs/toys/`.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.
