---
# stimming-8ljj
title: 'Star Chart: a volumetric Crab Nebula'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T09:37:02Z
updated_at: 2026-11-25T19:56:03Z
parent: stimming-e35i
---

Tom, 2026-11-25, on the first Crab: "crab looks cheap -- volumetrics scale -- pizzaz dude if too ambitious bean t".

The first Crab (stimming-404a) is a flat 2D pattern in the final pass (crabNeb, runaway kind 4): a blue haze, ridged-noise filaments, a torus. It has no depth, no parallax and no sense of size.

Goal: the Crab as a lit volume with real scale.
- Ray-march an ellipsoid shell in 3D (view rays through uCamM), so a drag turns it and the filaments part in depth.
- Filaments as 3D ridged noise in a thick shell, emission summed along the ray with absorption, red and gold; the synchrotron glow as a soft inner volume, blue-white, brightest round the pulsar.
- Scale cues: the pulsar a pip inside, faint far stars behind seen through the gaps, the wisps near the torus moving slowly (the Hubble wisps move at about half light speed).
- Perf: march at reduced resolution or in the baked volume pass; hold the 30 fps budget; one perf change at a time, judged live.
- The Ring Nebula (stimming-wcfv) may reuse the same shell march.

- [x] Pick the technique and its pass (final pass at half resolution, or the volume pass): a baked 128³ volume (NBAKE), marched in the final pass
- [x] March the shell: front-to-back 48-step march, tilted M1 silhouette with western bay, O III / S II / H-alpha filament palette, absorption
- [x] Scale cues and parallax on drag: 3D tilted pulsar wind torus with expanding relativistic wisps, curved bipolar jets, faint stars through gaps
- [ ] Perf check live with Tom
- [ ] Tom looks at it live
