---
# stimming-40u6
title: 'Toy: Wave machine'
status: completed
type: feature
created_at: 2026-11-23T10:25:10Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Wave machine (idea 128, group A, a lab demonstration) as a Lab toy: an MVP at high fidelity, Bar v3. Flick a rod of a torsion wave machine; the twist wave runs out, reflects at the far end and runs back, slowly damping. Plan: docs/plans/wavemachine.md.

- [x] Plan at docs/plans/wavemachine.md
- [x] Reference photos and videos of real torsion wave machines
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Hero: flick a rod; the twist wave runs out, reflects, runs back and damps; two pulses pass through each other
- [x] Sound: finished, muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-wavemachine-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/wavemachine.md
- [x] Commit and push
- [ ] Tom's sign-off
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

Defaults (Tom's open question, "3D or flat, and the presentation"): 3D, three.js 0.170. A high three-quarter view along the machine from its near end, on a black lab bench under one warm lamp behind the middle. 96 chromed rods, 46 cm, 18 mm apart, brass weights, a flat torsion band. The far end is clamped, so a pulse returns inverted; the near end is free. Slider Weights (wave speed 58 to 32 rods a second). Actions Flick (Space) and Still (R). The first frame holds a pulse in flight.

Reference: University of Maryland and University of Colorado demo pages (rods 23 to 46 cm, a clamped end inverts the pulse, a free end does not), classroom photos of the bench machine.

QA (2026-11-23, headless Chromium, ANGLE GL, RTX 3070): Q1 to Q10 pass. Q4 0 frames at rest; Q5 0 frames hidden; Q9 the context runs after a gesture and is suspended at rest. Q10: 16.7 ms median and p95 while a pulse runs.

