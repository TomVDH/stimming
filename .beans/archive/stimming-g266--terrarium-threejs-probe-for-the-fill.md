---
# stimming-g266
title: 'Terrarium: three.js probe for the fill'
status: completed
type: spike
created_at: 2026-11-16T20:57:33Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-ral1
---

Question: does the Terrarium gain from three.js for the planned fill fidelity (instanced moss strands, rule-grown fronds of leaflets, shadows, translucency)?

Probe: terrarium/probe.html (noindex), three.js 0.170.0, same camera and jar profile as the toy.

- [x] Scene, jar (transmission glass), substrate layers, grow light with shadows
- [x] Moss: instanced strands, cushions, spore stalks; wake folds and greens them
- [x] Fronds: instanced leaflets on rule-grown rachises; wake unrolls them
- [x] Stills beside the current toy; frame time, draw calls, triangles
- [x] Findings and a recommendation in docs/plans/terrarium.md

## Result

The fill gains a lot from three.js (strands, leaflets, stones, soft shadows); the glass does not. Recommendation: hybrid, three.js garden into a buffer, the toy's own glass on top. Numbers and the cost plan are in docs/plans/terrarium.md under Probe result. Tom asked for soft shadows: VSM, blur 14.
- [ ] Tom decides: build the hybrid
