---
# stimming-zsv0
title: 'Toy: Singing bowl'
status: in-progress
type: feature
created_at: 2026-11-16T08:33:43Z
updated_at: 2026-11-16T08:33:43Z
---

Lab toy, idea 256 (group D, stimming and fidget): circle the rim; the tone builds and the water dances.

A heavy hammered bronze bowl with a little water in it, seen from above and a little to the side, in a dark quiet room. Circle the rim with the pointer as with a wooden wand: a steady circle builds the tone, and the water answers with a standing pattern of fine ripples from the four points where the rim moves most. At full voice, drops leap from those four points. Break the rhythm and the tone wavers; stop and it rings on and fades. A tap strikes it like a bell. When the bowl is quiet and the water is flat, the page goes idle.

Tier: raw WebGL2 (analytic ray cast of the bowl, the water, the drops and the wand; the steady ripples are drawn from eight sources on the waterline; a ping-pong wave map carries the passing rings). Sound: raw Web Audio through audioKit(): inharmonic doublet partials that beat, a long decay, a stick-slip rasp, a room.

## Checklist

- [x] Blockout: page on Bar v2, ray-cast bowl, water disc, rim gesture
- [x] Look: hammered bronze, lamp, water reflection and caustics, drops
- [x] Bowl physics: rub build-up, waver, strike, damp, long decay, pattern follows the wand
- [x] Water: standing ripples from the busy points, passing rings from strikes and drops, crispation at full voice
- [x] Sound: doublet partials with beats, rasp, strike, drips, room
- [x] Performance: detail level, slow-frame step, idle when quiet, reduced motion
- [ ] QA: console, gestures, controls, 1280, 375 x 812, 812 x 375
- [ ] Toy doc docs/toys/bowl.md
- [ ] Handoff files: toys-entry.json, menu-li.html, menu-icon.js
