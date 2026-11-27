---
# stimming-zsv0
title: 'Toy: Singing bowl'
status: completed
type: feature
created_at: 2026-11-16T08:33:43Z
updated_at: 2026-11-27T07:19:52Z
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
- [x] QA: console, gestures, controls, 1280, 375 x 812, 812 x 375
- [x] Toy doc docs/toys/bowl.md
- [x] Handoff files: toys-entry.json, menu-li.html, menu-icon.js

## Summary of Changes

- `bowl/index.html`: the toy on Bar v2. Raw WebGL2: a ray cast of the bowl (two ellipsoids cut by the rim, the foot and a flat floor), the water, the drops and the wand, under a warm lamp and a window pane. Hammered outer wall, turned inner wall, half-round lip, three alloys.
- The bowl state: two signed amplitudes per mode (modes 2 to 6). Circling the rim drives mode 2 toward a level set by the speed; the pattern turns with the wand; an unsteady circle wobbles the level and the pitch. A tap strikes all modes at its angle; a held press damps; Hush stops it.
- The water: a height map once a frame from eight sources on the waterline (the rim's busy and still points), so four fans of ripples meet in a standing lattice; a wave map adds the strike ring and the drops' dents; caustics on the floor and on the wall; drops leap from the four points at full voice.
- Sound (raw Web Audio through `audioKit()`): ten partial tones into two ears, so strikes beat and the beat swings between the ears; a rasp that ducks once the tone catches; strike extras, plips, fizz, hush and a room. Checked by offline renders and spectrograms.
- Idle: the loop sleeps when the ripples fall below sight; the sound fades on by itself.
- `docs/toys/bowl.md`: the toy doc.
- Handoff files for the menu tile, the icon block and the toys.json entry went to the orchestrator.

Not verified: the sound by ear, the live frame rate, frame times on a phone.
