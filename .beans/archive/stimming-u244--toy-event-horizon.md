---
# stimming-u244
title: 'Toy: Event horizon'
status: completed
type: feature
created_at: 2026-11-23T11:31:53Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Build Event horizon (idea 237, group B) as a Lab toy: an MVP at high fidelity, Bar v3. Toy id eventhorizon. A black hole with a thin, hot accretion disc in deep space, ray-traced so the starfield and the disc bend round the shadow: the far side of the disc arcs over and under the hole, the photon ring is a thin bright line, the approaching side is Doppler-brightened and bluer. Drag to orbit the camera and watch the lensing swing; tap to drop a star in: it stretches into a stream, wraps round and feeds the disc with a flare that fades as it spirals in. Plan: docs/plans/eventhorizon.md.

- [x] Plan at docs/plans/eventhorizon.md
- [x] Reference renders of lensed black holes (NASA SVS 13326, Luminet 1979, Starless; tidal disruption visuals)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/eventhorizon/01-blockout.jpg)
- [x] Hero moment: geodesic lensing, disc with Doppler and photon ring, orbit drag with glide, star drop, tear, stream, flare
- [x] Sound: drone, flare roar, star chirp, arrival chime, tear, boom, orbit air; muted by default
- [x] Bar v3 spec and copy
- [x] Icon round spike-eventhorizon-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/eventhorizon.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

Stack type: Shader, raw WebGL2 (shared/gl.js, bloom from shared/glow.js, grade from shared/grade.js, detail ladder from shared/detail.js). No shared module changed. New files in shared/: the intro emblem and the favicon only.

## Defaults chosen (Tom's open question: 3D or flat, and the presentation)

- 3D, raw WebGL2: each pixel traces a light ray through a Schwarzschild field (RK4). No thin-lens trick, no mesh.
- The home view: 11 degrees over the disc, 30 radii out, so the far side of the disc arches over the shadow and a thin arc runs under it. Drag orbits freely above and below the disc; Zoom spans 17 to 44 radii.
- The look: deep space, a sparse point starfield and a faint galaxy band; the disc carries the light, white-gold inside to deep orange outside. The approaching side (right, at home) is brighter and bluer.
- The star falls in the disc plane, prograde, from the tapped side; it tears at r = 6.4 into a stream that whips round the shadow, wraps the front, flares and spirals in over about 15 s. Three stars at most at once.
- The stream reads as a thin hot slab, so it shows even edge-on.
- Bar v3: Drop (Space), Reset (R), Zoom slider. No choice row: one hero, no modes.
- Icon: no pick existed. Round eventhorizon-1 (Current, A, D); A is on the menu; the intro emblem is A's emblem (the arch, the photon ring in a dark gap, the disc).
- Draft Dutch name: Waarnemingshorizon /ˈʋaːrneːmɪŋsˌɦoːrizɔn/. Accent oklch(0.78 0.15 62).

## QA (headless Edge, D3D11, RTX 3070)

- Q1: node --check passes on the four modules, the menu scripts, the icon page and the sheet.
- Q2: clean console in play, on ?lab with the tile hovered, on the icon page and the sheet.
- Q4: drift 27.5 rAF per second; 62 s after the last input, 0 frames in 2 s.
- Q5: hidden tab, 0 frames in 2 s.
- Q6: reduced motion: clean console, 0 frames at idle, a tap still drops a star.
- Q7: Drop, Reset, Zoom slider (3 controls); How to play has 4 rows.
- Q8: arrows orbit, Space drops, R brings the view home.
- Q9: the context runs after a gesture and is suspended once the toy sleeps.
- Q10: frame times through a drop: median 7.6 ms, p95 8.4 ms.
- Load: first frame 0.75 s cold (tools/loadtime.mjs).
- Captures: docs/qa/eventhorizon/.
