---
# stimming-9cc8
title: 'Toy: Exoplanet'
status: in-progress
type: feature
created_at: 2026-11-09T18:51:42Z
updated_at: 2026-11-09T18:51:42Z
---

Build Exoplanet from docs/plans/exoplanet.md. It starts in the Lab. One star through three instruments: Transit (the disc and its light curve), Spectrograph (the waterfall) and Coronagraph (mask, speckles, hold to integrate). Drag folds the trial period in every mode. One target in four never folds. Bar v2, raw WebGL2.

- [x] Plan: docs/plans/exoplanet.md
- [x] Task 1: templates, 256 strips, tellurics, grade (blockout)
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom (stills seen in the pane; Tom reviews live)
- [x] Task 2: fold, scrub, wheel, detent, lock; periodogram and light curve
- [x] Task 3: transit, Rossiter skew, cosmic rays, gaps, readout sweep, cut, readout; wrong stars
- [x] Task 4: sound: hum, shutter, hiss, stir, planet tone, growl (Q9)
- [x] Task 5: Settings, persistence, watchdog, idle; Q1 to Q10; tests/run.sh
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] Rev 2: Transit, Spectrograph and Coronagraph on one tray; Target moves to Settings
- [ ] Tom sets the Dutch name (draft Exoplaneet)
- [ ] Record the session cost

## Notes

- Blockout (2026-11-09): one pass, no render targets. R16F templates sampled with FLOAT upload. Blaze curve, hot and dead column, 1/14 gap rows. Checked at 1280 and 375 px in the browser pane, console clean.
- Fold (2026-11-09): drag gain 1/180 per px on log P, vertical 1/1400 as the fine dial; detent divides gain by 1 + 6 power; the pull eases inside 1.5 %, lock inside 0.4 %. A hold that moves becomes a fold. Lock reached from P = 3 in about 60 px on TOI-4811. The hidden browser pane pauses rAF; a screenshot kicks it.
- Texture and cut (2026-11-09): the cut is a thin cyan line over the top rows, from the CPU templates; a tap holds it 2 s. The readout wanders for 0.7 s after a lock. On phones the readout drops under the top corners.
- Sound ruling: the plan says the hum is always on while the loop runs. The batch rule (Q9) wants the context asleep once the toy settles, so the hum plays while lively and for a 4 s tail after input, then the context rests. Shutter ticks play only in that window. Cost if wrong: a quieter idle than the plan describes.
- Q9 checked in the pane: context running after a real drag, suspended 8 s later. The growl triggers only on entering a dip row, once per swell.
- Task 5 (2026-11-09): Q1 node --check clean for the toy and the menu. Q2 console clean through stepper, Shuffle, slider, every Settings row, drag, wheel, tap. Q4 no frame request 75 s after load. Q7 five controls. Q8 keys 1 to 8 and Space. Q9 passes. tests/run.sh 98/98. Layouts checked at 1280 x 800, 375 x 812 and 812 x 375; the readout sits right-aligned under the top corners below 900 px.
- Not checked: reduced motion (the pane cannot emulate it), the pinch on a real touch screen, fps on a real device (Q10), sound levels by ear, the RM skew by eye. The debug accessor used for the checks is removed.
- Rev 2 (2026-11-09, Tom: "looks too similar to Sonar, make it a telescope"): the choice is a tray of three instruments (keys T, S, C); Target is a stepper row in Settings. Transit draws the star over the whole field (`STAR_FS`: limb darkening, granulation, four spikes, halo) with the light curve as 3 px dots beside it; at lock the planet's black disc crosses the star and the cursor slows to a fifth through the transit so the crossing can be watched. Coronagraph (`CORO_FS`): mask, leak ring, speckles that boil and freeze as `integ` rises under a hold; the planet PSF comes up at its orbit position, and a wrong star brings up a ragged dust arc instead. Checked in the pane at 1280, 375 x 812 and 812 x 375: console clean, lock in Transit, the silhouette crossing, the hold in Coronagraph, the wrong star in all three modes. Not checked: sound by ear, real touch, reduced motion.
