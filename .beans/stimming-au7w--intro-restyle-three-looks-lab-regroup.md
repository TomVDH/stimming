---
# stimming-au7w
title: 'Intro restyle: three looks, lab regroup'
status: completed
type: feature
priority: normal
created_at: 2026-11-09T22:21:16Z
updated_at: 2026-11-09T23:09:08Z
parent: stimming-jdik
---

Three restyle looks (Brut, Label, Poster) as lab varieties on Classic's timing table. The lab panel regroups into Layout, Type, Box, Glass, Timing.

- [x] Look layer in shared/intro.js (look, style guard, stack, CLASSIC)
- [x] Three scoped look blocks in shared/intro.css
- [x] Lab regroup, timing lock, options group, panel style
- [x] Verify timing, logo point, fit
- [x] AGENTS.md


## Notes

Headless QA, 2026-11-09: phase-to-phase beats match Classic within one frame; the logo's centre holds at 1280x800, 375x812 and 812x375; Classic screenshots are byte-equal to main at pop, flash and rest. Open: Tom picks one look in the lab.

Second round, 2026-11-09: Plate, Signal and Readout added on Tom's request. Same checks pass (beats within one frame, logo fixed, fit clean at the three sizes).

Third round, 2026-11-09: Signal takes a per-toy ink (colour or gradient) after a white flash. Strobe moved into Restyle on the shared beats. Open: Tom's lab was on Snap when he compared timing; he has not yet said whether the looks keep Classic's table or move to Snap's.

Decision, 2026-11-09: Tom picks Signal as the intro for now, default on every toy. The other looks stay in the lab. Open: per-toy inks beyond the main shelf are hue placeholders; the Snap or Classic table question.

Accents, 2026-11-09: every toy in toys.json carries `accent` (one colour or a gradient), a first proposal for all 79. The Signal intro reads it. `introlab/accents.html` shows them all. Open: Tom's review of the accents; other surfaces that use them.

## Summary of Changes

Signal is the default intro: white flash, then the logo takes the toy's accent; the title stays white. Signal keeps Classic's beats. toys.json carries `accent` for every toy (first proposals). Brut, Label, Poster, Plate, Readout and Strobe stay in the lab's Restyle group. The lab groups knobs as Layout, Type, Box, Glass, Timing (locked) and Options. `introlab/accents.html` shows every accent.

Follow-ups: Tom reviews the accents; Snap or Classic beats; accents on other surfaces.
