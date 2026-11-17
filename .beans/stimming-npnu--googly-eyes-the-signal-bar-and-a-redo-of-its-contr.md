---
# stimming-npnu
title: 'Googly eyes: the Signal bar and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T08:54:08Z
updated_at: 2026-11-17T08:54:08Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: Shuffle, Shake, Blink: check that each earns its place.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [x] Apply the redo to the toy's `bar` spec (2026-11-17; Tom: "Yes, apply"), as proposed
- [x] Switch the toy to the Signal bar: `signal: true` in `eyes/main.js` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [x] 1280 px, 375 x 812 and 812 x 375; clean console (2026-11-17, with the new copy)
- [x] The toy's doc in `docs/toys/` says what is true (the bar block, by hand)

## Review and copy rewrite of 2026-11-17 (applied the same day; Tom: "Yes, apply")

The rules are those of the six toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action | Shuffle | Keep | The only way to a new cluster. It is also the toy's reset. |
| Action | Shake | Keep | One verb. Space and a drag on empty space do the same; the button shows it on a phone. |
| Action (B) | Blink | Keep | One verb. |
| Settings | Quality | Keep | The only row. |

Each of the three earns its place: the bar holds three words and nothing else. Dizzy has no button; a fourth action is over the limit of three.

### How to play

| Input | Have | Suggested |
|---|---|---|
| Click | blink | Blink an eye |
| Click | (not listed) | Blink all the eyes |
| Drag | move an eye | Move an eye |
| Drag | (not listed) | Shake the eyes |
| Circle | dizzy, as "drag" with the word "round" | Make the eyes dizzy, with a new drawing: a mouse and a round arrow |
| Arrows | (not listed) | Move the point the eyes watch |
| Shift and the arrows | (not listed) | Move an eye |
| Enter | (not listed) | Blink an eye |
| B | blink | Blink all the eyes |
| D | (not listed) | Make the eyes dizzy |
| Space | shake | Shake the eyes |

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | "A cluster of googly eyes that watch the pointer. Arrow keys move what they watch, Shift with arrows drags an eye, Enter blinks one, B blinks them all, D makes them dizzy and Space shakes them. Shuffle deals a new cluster." | "A cluster of googly eyes. The eyes watch the pointer. Press the arrow keys to move the point they watch. Hold Shift and press the arrow keys to move an eye. Press Enter to blink an eye. Press B to blink all the eyes. Press D to make the eyes dizzy. Press Space to shake the eyes. Shuffle gives a new cluster." |
| Line when the toy cannot run | "Googly eyes needs WebGL 2, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL 2." |
| Intro, under the name | Nothing | Keep |

### Findings

- The builder had no drawing for a circle gesture. It has one now: `circle` in `shared/signal.js`, and `circle` is a pointer word in `shared/stim.js`, so the row stays on touch.
- A click on empty space starts a wave of blinks from the point. "Blink all the eyes" is close, not exact.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.
