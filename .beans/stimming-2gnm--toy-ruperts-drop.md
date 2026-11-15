---
# stimming-2gnm
title: 'Toy: Rupert''s drop'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-15T09:41:14Z
updated_at: 2026-11-15T10:25:55Z
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
- [ ] Reduced motion
- [x] Intro fallback text and vignette
- [ ] QA: console, gestures, controls, sound, 1280, 375 x 812, 812 x 375
- [ ] Toy doc: docs/toys/rupert.md
- [ ] Handoff: toys-entry.json, menu-li.html, menu-icon.js
