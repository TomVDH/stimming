---
# stimming-d3af
title: 'Tornado alley: ACES fitted tone map option in shared output'
status: completed
type: task
priority: normal
created_at: 2026-11-17T07:29:15Z
updated_at: 2026-11-17T07:34:53Z
parent: stimming-dwwg
---

Add Hill's fitted ACES (RRT+ODT with the input and output matrices) to shared/output.js and an opt-in state value in shared/environment.js, default off. Tornado alley opts in, with a Dev row 'Tone map: Film / ACES' after Exposure for A/B.

- [x] ouAcesFit and ouFilmAces in shared/output.js
- [x] state.tone in shared/environment.js, default film
- [x] Tornado alley: Tone map Dev row, ACES default, exposure gain per curve
- [x] Live A/B in Tornado alley, no console errors
- [x] Another environment toy checked unchanged
- [x] Stills of both curves at golden hour and dusk in docs/qa/tornado-aces/

## Summary of Changes

- `shared/output.js`: `ouAcesFit` (Hill's RRT and ODT fit with the AP1 matrices) and `ouFilmAces` (exposure / 0.6, the fit, sRGB, dither).
- `shared/environment.js`: `state.tone`, default `'film'`. `'aces'` picks `ouFilmAces` in the final pass. Grade and dither stay where they were.
- `tornado/main.js`: Dev row Tone map after Exposure, default ACES, gain 1.1; `?tone=film` for one load.
- QA: `docs/qa/tornado-aces/`. Default output bit-equal to the old code.
