---
# stimming-71qx
title: 'Toy: Purr'
status: completed
type: feature
priority: normal
created_at: 2026-11-15T09:00:58Z
updated_at: 2026-11-27T07:19:52Z
---

Lab toy, idea 264 (group D, stimming and fidget): stroke a furry blob; the fur follows and it purrs.

A soft blob of no known species fills the stage. A stroke lays the fur along the hand, and the pelt keeps the track, as velvet does. The body leans into the hand and breathes. A steady stroke rhythm builds a purr. A stroke against the grain, or a poke, makes the fur bristle. Left alone, it settles, sighs and sleeps; the page then goes near idle.

Tier: raw WebGL2 (shell-fur march in one pass, comb field in a ping-pong texture). Sound: raw Web Audio through audioKit().

## Checklist

- [x] Blockout: page on Bar v2, blob, comb field, a stroke writes the field
- [x] Look: fur march, anisotropic sheen, rim light, four pelts
- [x] Creature: lean, breath, bristle, poke, eyes, settle and sleep
- [x] Sound: purr that follows the stroke rhythm; rustle, chirp, grumble, sigh, shake
- [x] Performance: detail level, slow-frame step, near idle while asleep, reduced motion
- [x] QA: console, gestures, controls, 1280, 375 x 812, 812 x 375
- [x] Toy doc docs/toys/purr.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `purr/index.html`: the toy on Bar v2. Raw WebGL2: a comb map (ping-pong) that strokes write into, a per-frame strand and body map (one MRT pass), and a shell-fur march per pixel with Kajiya-Kay light, two sheens, a rim and bloom.
- Four pelts: Velvet (short pile, shows the track best), Shag (long clumps), Frost (white, glints), Ember (coal-dark, tips glow as it purrs).
- The creature: it leans into the hand, breathes, and slumps as it dozes. A poke dents it and bristles the fur. Strokes against the grain bristle it; enough of them puff the whole coat. Two bead eyes open on a poke and shut in bliss.
- Sound (raw Web Audio through `audioKit()`): a purr of breath noise chopped by a 22 to 30 Hz pulse train, following the breath and the stroke rhythm; rustle with static, chirp, grumble, sigh and shake voices.
- Sleep: 8 s without a touch it sighs and settles; at 13 s it sleeps, and a cached frame breathes at about 20 fps. Reduced motion stops that loop.
- `docs/toys/purr.md`: the toy doc.
- Handoff files for the menu tile, the icon block and the toys.json entry went to the orchestrator.

Not verified: the sound by ear (measured only), reduced motion by emulation, frame times on a phone.
