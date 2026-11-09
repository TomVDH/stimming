---
# stimming-9cc8
title: 'Toy: Exoplanet'
status: in-progress
type: feature
created_at: 2026-11-09T18:51:42Z
updated_at: 2026-11-09T18:51:42Z
---

Build Exoplanet from docs/plans/exoplanet.md. It starts in the Lab. A spectrograph waterfall of one star; drag to fold the trial period until the line wobble and the transit band line up. One target in four never folds. Bar v2, raw WebGL2.

- [x] Plan: docs/plans/exoplanet.md
- [x] Task 1: templates, 256 strips, tellurics, grade (blockout)
- [ ] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [ ] Task 2: fold, scrub, wheel, detent, lock; periodogram and light curve
- [ ] Task 3: transit, Rossiter skew, cosmic rays, gaps, readout sweep, cut, readout; wrong stars
- [ ] Task 4: sound: hum, shutter, hiss, stir, planet tone, growl (Q9)
- [ ] Task 5: Settings, persistence, watchdog, idle; Q1 to Q10; tests/run.sh
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft Exoplaneet)
- [ ] Record the session cost

## Notes

- Blockout (2026-11-09): one pass, no render targets. R16F templates sampled with FLOAT upload. Blaze curve, hot and dead column, 1/14 gap rows. Checked at 1280 and 375 px in the browser pane, console clean.
