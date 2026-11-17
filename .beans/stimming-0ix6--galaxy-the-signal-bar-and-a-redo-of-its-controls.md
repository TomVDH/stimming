---
# stimming-0ix6
title: 'Galaxy: the Signal bar and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-17T08:54:08Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Little: confirm the order of the 16 options and the two streak sliders.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, apply"), as proposed
- [x] Switch the toy to the Signal bar: `signal: true` in `galaxy/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with the new copy)
- [x] The toy's doc in `docs/toys/` says what is true (the Idea line, the bar block and the gesture table, by hand)

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, apply")

The rules are those of Cauldron, Train ride and Railgun: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List heading | Add | Objects | A noun for what the list holds, as Cauldron's Ingredients. The stage label calls them objects. |
| List, last option | Supermassive | Black hole | An adjective alone. It places a supermassive black hole. |
| Slider | Gravity | Speed | The value scales the time step (`simDt = dt * pace`). It does not change a force. |
| Action (C) | Clear | Keep | The shared verb. It stays on the bar; Reset stays in Settings. |
| Settings | Star streaks, Effect streaks | Keep | Two rows; a group heading adds more than it saves. |
| Settings | Quality, Reset | Keep | |

The 16 other options keep their names and their order: Star, Binary star, Pulsar, Supernova, White hole, Magnetar, Wormhole, Nebula, Comet, Red giant, Globular cluster, Kilonova, Gamma-ray burst, Cosmic string, Dark nebula, Dark well.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | place | Add an object |
| Hold | (not listed) | Grow a star cluster |
| Hold and drag | throw a cluster | Throw the star cluster |
| Drag | move | Move an object |
| Scroll (pinch on touch) | zoom | Zoom the view |
| Space | (not listed) | Add an object at the centre |
| + and - | (not listed) | Zoom the view |
| C | clear | Clear the sky |
| R | (not listed) | Reset the toy |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | One 90-word sentence group that names all 17 objects | "A galaxy of stars. Click to add the object from the Objects list. Hold to grow a star cluster. Drag to throw it. Drag an object to move it. Scroll to zoom the view. Objects that touch merge. Seven merged objects make a black hole. Press Space to add an object at the centre. Press C to clear the sky. Press R to reset the toy." |
| Line when the toy cannot run | "Galaxy needs WebGPU, which this browser doesn't have." | "This toy cannot run in this browser. It needs WebGPU." |
| Intro, under the name | Nothing | Keep |
| Motto | And off we fly at critical speed | Keep; it is Tom's. |

### Findings

- Clear keeps one object: the heaviest (`clearAll`). The help row says "Clear the sky"; that is close, not exact.
- The builder could not draw a `+` keycap: it split a key word on `+`. A lone `+` or `/` is now a key (`inputHTML` in `shared/signal.js`).
- Space, the zoom keys and R act but show nowhere today.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.
