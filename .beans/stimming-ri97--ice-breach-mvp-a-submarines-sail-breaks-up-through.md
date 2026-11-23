---
# stimming-ri97
title: 'Ice breach: MVP, a submarine''s sail breaks up through pack ice'
status: in-progress
type: feature
created_at: 2026-11-23T19:32:36Z
updated_at: 2026-11-23T19:32:36Z
parent: stimming-oh7b
---

Idea 240 Ice breach, batch 9, grown to XXL. Tom, 2026-11-23: picked it as the XXL to start today; "we should have a sub model in buoy business -- go". Plan: docs/plans/icebreach.md. Stack type: Scene (three.js 0.170).

Arctic night. A submarine's sail breaks up through pack ice. Hold to surface: the ice bulges, groans and cracks in a star, then breaks; slabs tilt and slide off the hull; a snow plume rises (Fire's smoke shading); black water floods the floe; the sea calms and refreezes. Release or tap to dive. A long, low lens across the floe.

- [x] Plan in docs/plans/icebreach.md
- [x] Reference photos: Akula sail, ICEX surfacings, ice fracture
- [x] Akula model: Tom said use the Buoy Business GLB (2026-11-23); licence unknown, in CREDITS.md
- [x] Blockout in the real framing, 1280 x 800 capture to Tom
- [x] Ice: bulge, star cracks, slabs with thickness and snow, tilt and slide
- [x] Water floods the floe; calm and refreeze
- [x] Snow plume: K3 fluid with Fire's smoke shading
- [x] Polar night light: moon, snow glint, long lens
- [x] Sound: groans, cracks, hull rush, water; muted by default
- [x] Bar v3 through initPage
- [x] Icon round icons/spike-icebreach-1.html (Current none, A, D), emblems, sheet row
- [x] Intro emblem shared/emblems/icebreach.svg, favicon
- [x] toys.json Lab entry, Lab tile first in index.html, GSAP hook
- [x] QA: 1280, 375, 812x375, reduced motion, idle, captures
- [x] Toy doc docs/toys/icebreach.md
- [ ] Tom's look at the shot, the breach and the flood

## Notes

QA (headless Edge, D3D11, RTX 3070, 1280 x 800): render under 1 ms CPU a frame; slab step about 8 ms through the breach, none once the pack locks. Idle at rest: 0 frames in 2 s. Reduced motion: 0 frames 3 s after the lock. Console clean with sound on and off. Captures: docs/qa/icebreach/.
