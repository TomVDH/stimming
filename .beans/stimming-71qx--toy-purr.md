---
# stimming-71qx
title: 'Toy: Purr'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:00:58Z
updated_at: 2026-11-15T09:33:00Z
---

Lab toy, idea 264 (group D, stimming and fidget): stroke a furry blob; the fur follows and it purrs.

A soft blob of no known species fills the stage. A stroke lays the fur along the hand, and the pelt keeps the track, as velvet does. The body leans into the hand and breathes. A steady stroke rhythm builds a purr. A stroke against the grain, or a poke, makes the fur bristle. Left alone, it settles, sighs and sleeps; the page then goes near idle.

Tier: raw WebGL2 (shell-fur march in one pass, comb field in a ping-pong texture). Sound: raw Web Audio through audioKit().

## Checklist

- [x] Blockout: page on Bar v2, blob, comb field, a stroke writes the field
- [x] Look: fur march, anisotropic sheen, rim light, four pelts
- [x] Creature: lean, breath, bristle, poke, eyes, settle and sleep
- [ ] Sound: purr that follows the stroke rhythm; rustle, chirp, grumble, sigh, shake
- [ ] Performance: detail level, slow-frame step, near idle while asleep, reduced motion
- [ ] QA: console, gestures, controls, 1280, 375 x 812, 812 x 375
- [ ] Toy doc docs/toys/purr.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
