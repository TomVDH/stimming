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
- [x] Task 2: fold, scrub, wheel, detent, lock; periodogram and light curve
- [x] Task 3: transit, Rossiter skew, cosmic rays, gaps, readout sweep, cut, readout; wrong stars
- [x] Task 4: sound: hum, shutter, hiss, stir, planet tone, growl (Q9)
- [ ] Task 5: Settings, persistence, watchdog, idle; Q1 to Q10; tests/run.sh
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft Exoplaneet)
- [ ] Record the session cost

## Notes

- Blockout (2026-11-09): one pass, no render targets. R16F templates sampled with FLOAT upload. Blaze curve, hot and dead column, 1/14 gap rows. Checked at 1280 and 375 px in the browser pane, console clean.
- Fold (2026-11-09): drag gain 1/180 per px on log P, vertical 1/1400 as the fine dial; detent divides gain by 1 + 6 power; the pull eases inside 1.5 %, lock inside 0.4 %. A hold that moves becomes a fold. Lock reached from P = 3 in about 60 px on TOI-4811. The hidden browser pane pauses rAF; a screenshot kicks it.
- Texture and cut (2026-11-09): the cut is a thin cyan line over the top rows, from the CPU templates; a tap holds it 2 s. The readout wanders for 0.7 s after a lock. On phones the readout drops under the top corners.
- Sound ruling: the plan says the hum is always on while the loop runs. The batch rule (Q9) wants the context asleep once the toy settles, so the hum plays while lively and for a 4 s tail after input, then the context rests. Shutter ticks play only in that window. Cost if wrong: a quieter idle than the plan describes.
- Q9 checked in the pane: context running after a real drag, suspended 8 s later. The growl triggers only on entering a dip row, once per swell.
