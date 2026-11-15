---
# stimming-2gnm
title: 'Toy: Rupert''s drop'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:41:14Z
updated_at: 2026-11-15T10:41:05Z
---

Idea 127 (Group A, school and uni lab experiments): "Hammer the head: nothing. Snip the tail: it explodes, slowly."

A Prince Rupert's drop rests on a wet black table in a dark studio. Click the head: a steel hammer swings down, bounces off, the glass rings and nothing happens. Click the tail: pliers nip it, time drops to extreme slow motion, a fracture front races from the cut through the head, the glass goes white with cracks behind it, and the drop bursts into a slow cloud of glittering powder that settles on the table. The Time slider scrubs the slow motion, forward and back. Reset drips a glowing gob that quenches in a hiss of steam and cools into a new drop. Light: Clear (refraction, dispersion, caustics) or Polarised (rainbow stress fringes that drain away behind the crack front).

Tier: raw WebGL2. One raymarch pass draws the drop (round-cone chain SDF), the tools and the floor; instanced shard quads draw the fragments from closed-form motion; bloom is the shared chain in shared/glow.js; grade and output from shared/grade.js and shared/output.js.

## Checklist
- [x] Drop: round-cone chain SDF, glass refraction, dispersion, floor caustics and reflection
- [x] Polarised look: photoelastic stress fringes
- [x] Hammer: swing, bounce, ring, ripples, stress wave
- [x] Snip: cutters, tip piece, crack front, frosted glass
- [x] Burst: fragments, slow cloud, speed ramp, settle on the floor
- [x] Time slider scrub; Reset: glowing gob, quench, cooling
- [x] Bar v2: Light choice, Reset, Time slider, Settings, Dev rows, key strip
- [x] Sound: hammer ring, snip, stretched slow-motion shatter, quench hiss
- [x] Idle: the loop stops when still; whenVisible; detail level; slow-frame step
- [x] Reduced motion
- [x] Intro fallback text and vignette
- [x] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [x] Toy doc: docs/toys/rupert.md
- [x] Handoff: toys-entry.json, menu-li.html, menu-icon.js


## Summary of Changes

- `rupert/index.html`: a new Lab toy on Bar v2, raw WebGL2. One ray march draws the drop (15 round cones on a smooth curve), a big steel hammer, profile pliers and a wet black floor: refraction with one inner reflection, six-wavelength dispersion, lens shadow and caustic, mirror reflections, rings on the water.
- Hammer on the head: a heavy swing, two bounces, a ring of sound and stress, a jolt; nothing breaks.
- Pliers on the tail: time drops to slow motion (a cool grade and a falling tone), a crack front runs to the head, the glass frosts behind it, the tail crumbles, the head bursts into up to 14,000 glittering shards on closed-form paths; time ramps back up and the dust settles; the tip piece falls whole.
- Time slider scrubs the whole burst forward and back. Reset drips a glowing gob that quenches in steam and cools, the thin tail first.
- Light: Clear, or Polarised with photoelastic fringes measured square to the axis; the fringes drain away behind the crack.
- Sound through audioKit: hammer ring, snip, falling tone, slowed crackle, stretched boom and tinkles, ramp, dust sprinkle, tip tink, quench hiss.
- `docs/toys/rupert.md`: the toy doc. Handoff files for the menu tile, its GSAP block and the toys.json entry sit in the lab10 scratchpad.
- Open: reduced motion is code-reviewed only; not measured on a phone.
