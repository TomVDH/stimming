---
# stimming-07yy
title: 'Toy: Desert eclipse'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-22T20:08:20Z
updated_at: 2026-11-22T20:20:17Z
parent: stimming-oh7b
---

Build Desert eclipse (idea 17, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. A wide desert under a deep sky. Drag the moon over the sun: the light thins and cools, the shadow of the moon sweeps in from the horizon, shadow bands ripple over the ground, Baily's beads and the diamond ring flash, then totality: the corona, planets and bright stars, a 360-degree sunset glow on the horizon. Plan: docs/plans/eclipse.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

- [x] Plan at docs/plans/eclipse.md
- [x] Reference photos of total eclipses (corona, diamond ring, horizon glow, umbra)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/eclipse/01-blockout.jpg)
- [x] Hero moment: drag to totality and back, light and colour follow coverage, corona, diamond ring
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-eclipse-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/eclipse.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D sky and ground on a flat stage, raw WebGL2. The camera stands still at eye height on a white salt pan, level, facing the afternoon sun 24 degrees up, about 52 degrees across; horizon at 30%. Why: sun, corona and horizon glow share one frame; a fixed camera keeps it a diorama.
- Salt pan with three layers of far mesas (9, 22, 46 km), not dunes. Why: a plain light ground shows shadow bands best, the open horizon shows the 360-degree glow, the mesas give the dark something to fall on first.
- The sun is drawn about 7 times true size; the moon is 8% larger (near perigee). At true size the sun is 4 px wide.
- The umbra is a true 3D shadow, 55 km in radius, that leans toward the sun with height. It comes from the west, out of the sun, before mid-eclipse and leaves behind the viewer after.
- Drag anywhere moves the moon; near the sun it moves at a tenth of the hand, so the contacts hold. Release near the centre settles into totality. Tap or Space (Totality) glides in, or on out, slow through the contacts. Slider: Moon, its place along the path.
- Look by the reference photos (Wikimedia Commons): deep blue sky, pearl corona with streamers on a tilted equator and polar plumes, pink prominences, diamond ring with a short star, orange 360-degree glow, Venus and Jupiter.

## QA (2026-11-22)

- Q1 node --check: five modules and the six menu scripts pass.
- Q2 console clean on the toy (drag, tap, Space, glide), the phone view, reduced motion and the Lab hover. Intro shows the emblem.
- Q4 drift 32 frames a second; 0 frames after 62 s idle. Q5 hidden: 0 frames in 2 s.
- Q6 reduced motion: no drift; the light settles, then 0 frames.
- Q7 one slider, one action; three How rows. Q8 Space glides into totality (F = 0). Q9 context running after the gesture, suspended at the end.
- Q10 Edge headless on D3D11, RTX 3070, 1280 x 800, during a glide: frame median 7.6 ms, p95 8.1 ms.
- Captures: docs/qa/eclipse/ (01 blockout to 09 Lab tile hover).
