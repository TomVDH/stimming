---
# stimming-i3il
title: 'Fire: the Signal bar and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-17T08:54:08Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Reset is the only action on the bar; it may belong in Settings.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, apply"), as proposed
- [x] Switch the toy to the Signal bar: `signal: true` in `fire/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with the new copy)
- [x] The toy's doc in `docs/toys/` says what is true: Fire has no doc there, so no doc line is false

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, apply")

The rules are those of the five toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| List | Salt: Strontium, Lithium, Calcium, Sodium, Barium, Boron, Copper, Cesium, Potassium | Keep | A noun; real names. Each has its colour dot. |
| Slider | Intensity | Size | The stage label says it: "Intensity sets the fire's size". |
| Action | Reset, on the bar | Reset, in Settings | Reset is not a play action. Cauldron and Galaxy keep it in Settings. Nothing in the toy shows or hides it. |
| Settings | Base: Wood, Methanol, Magnesium | Fuel: Wood, Methanol, Magnesium | The code's own comment: "Base is the fuel that burns". |
| Settings | Motion: Steady, Gusts, Twister, Pulse | Keep | |
| Settings | Temperature, Turbulence | Keep | |
| Settings | Quality: Low, Medium, Standard, High | Keep | Fire has two steps of its own below the site's two. |

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | flick salt | Add salt |
| Click | (not listed) | Flare the fire |
| Hold | feed | Add a stream of salt |
| Drag | blow | Blow on the fire |
| Drag | (not listed) | Move the fire |
| A to Z, 0 to 9 | burn a word | Burn a word |
| Backspace | (not listed) | Remove a letter |
| Escape | (not listed) | Remove the word |
| Enter | (not listed) | Add salt |
| Space | (not listed) | Flare the fire |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | About 110 words in six long sentences | "A fire on a dark floor. Click the air to add salt. The salt colours the flames. Hold to add a stream of salt. Drag the air to blow on the fire. Drag the fire to move it. Click the fire to flare it. Type a word to burn it. Press Enter to add salt. Press Space to flare the fire." |
| Line when the toy cannot run | "Fire needs WebGPU, which this browser doesn't have." | "This toy cannot run in this browser. It needs WebGPU." |
| Intro, under the name | Stimming No. 21 | Remove; the intro shows no number. |

### Findings

- Bar v3 did not draw an option's colour dot. It now does (`optHTML` in `shared/signal.js`), so each salt keeps its colour.
- Reset is off until the sim is ready (`ui.action('reset').disabled`). In Settings it needs no such guard: the hook does nothing until the sim binds it.
- "Add salt" replaces "flick salt": add is the word on Cauldron and Galaxy.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.
