---
# stimming-qazn
title: 'Bubbles: the Signal bar and a redo of its controls'
status: in-progress
type: task
created_at: 2026-11-17T08:54:09Z
updated_at: 2026-11-17T08:54:09Z
parent: stimming-a5rs
blocked_by:
    - stimming-hvtr
---

One of the first ten (Tom, 2026-11-17, epic stimming-a5rs). The toy takes the Signal bar and gets its controls and menus redone in the same pass, clean and neat.

First read of what to redo: A held Blow. It has no key list, so How to play is empty.

## Checklist

- [x] List every control and what it does (from the spec, the input code and close-up stills of the real page; not a hands-on play session)
- [x] Check it against the eight points in stimming-a5rs
- [x] Propose the redo to Tom before any change (2026-11-17, below); Tom rules
- [ ] Apply the redo to the toy's `bar` spec
- [x] Switch the toy to the Signal bar: `signal: true` in `bubbles/index.html` (2026-11-17). Checked on the real page at 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] 1280 px, 375 x 812 and 812 x 375; clean console
- [ ] The toy's doc in `docs/toys/` says what is true

## Review and copy rewrite of 2026-11-17 (proposal; no word is changed)

The rules are those of the eight toys before it: one word for one thing; a label is a noun or one verb; a help row is one instruction with the verb first; the same action has the same words on every toy.

The first read said "It has no key list, so How to play is empty." That is out of date: the toy has a key list, and How to play shows five rows.

### Controls

| Where | Have | Suggested | Why |
|---|---|---|---|
| Action (Space, held) | Blow | Keep | One verb; the toy's own. |
| Action (P) | Clear | Pop all | The toy's verb is pop, and its key is P. Cauldron has its own verb too: Throw out. |
| Settings | Quality | Keep | The only row. |

### How to play

| Input | Have | Suggested |
|---|---|---|
| Move slowly | one big bubble | Blow one big bubble |
| Move fast | a spray | Blow a spray of bubbles |
| Click | pop | Pop a bubble |
| Space, held | blow | Blow a stream of bubbles |
| P | clear | Pop all the bubbles |

On touch the move is a drag and the click is a tap; the builder swaps the drawings.

### Other copy

| Where | Have | Suggested |
|---|---|---|
| Stage label for screen readers | "Bubble wand. Move the pointer through the air to blow bubbles; touch a bubble to pop it. Space blows a stream, P pops them all." | "A bubble wand in the air. Move the pointer to blow bubbles. Click a bubble to pop it. Hold Space to blow a stream of bubbles. Press P to pop all the bubbles." |
| Line when the toy cannot run | "Bubble wand needs WebGL, which this browser has turned off." | "This toy cannot run in this browser. It needs WebGL." |
| Intro, under the name | Nothing | Keep |

### Findings

- Fault, fixed: Bar v3 drew "move slow" as two keycaps, Move and Slow. A pointer move now has its own drawing: a mouse with no button down and an arrow (`move` in `shared/signal.js`; `move` is a pointer word in `shared/stim.js`).
- The toy has two names: "Bubble wand" on the page and in the intro, `bubbles` as its id. `toys.json` rules; not checked here.
- The toy has no Reset; Pop all empties the air.
- Bubbles has no doc in `docs/toys/`.
- Limits: a read of the spec, the input code and stills. No hands-on play. No real touch screen.
