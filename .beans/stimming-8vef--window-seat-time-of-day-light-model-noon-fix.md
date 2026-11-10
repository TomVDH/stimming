---
# stimming-8vef
title: 'Window seat: time-of-day light model (Noon fix)'
status: completed
type: task
created_at: 2026-11-10T09:02:43Z
updated_at: 2026-11-10T09:02:43Z
parent: stimming-w1nd
---

Tom says Noon looks off. Redo the time-of-day lighting as one model: fixed light, one exposure per hour, every surface follows.

- [x] Before stills of all seven hours at 1280 px
- [x] Diagnose Noon: single-scatter cloud phase, blue tint, weak wing sun, reveal gain 9
- [x] Exposure table: ev per hour, E = source x 2^ev
- [x] Cloud multiple-scatter lobe (CLOUD_MS)
- [x] Wing takes the bake's true sun
- [x] Reveal gain 5 (REVEAL_K)
- [x] Cabin daylight follows the sun's height
- [x] Noon neutral white balance; Golden warmer
- [x] After stills; note in the shared notes folder

## Summary of Changes

HOURS carries ev (stops) in place of E; E = (sun 1 or MOON 0.1) x 2^ev. Noon takes ev 1.3, the least exposure. The deck adds an isotropic multiple-scatter lobe (CLOUD_MS 1.5), so side-lit tops stay white. wing3 gives the sun its true irradiance, sunL / 1.5. The reveal gain drops from 9 to 5. Cabin daylight adds a term from the sun's height. Grade tint: Noon [0.9, 0.012, 85], Golden [0.84, 0.09, 68]. Branch claude/window-tod-e580bd, not merged; Tom decides. Classic shares shader.js and gets the cloud lobe and reveal gain.
