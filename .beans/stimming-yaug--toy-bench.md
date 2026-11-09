---
# stimming-yaug
title: 'Toy: Bench'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:29:16Z
updated_at: 2026-11-09T07:49:37Z
---

Build Bench from docs/plans/bench.md (D5: yes, one page, two chips). It starts in the Lab. One backlit beaker, two experiments: Electrolysis (a rainbow from acid to base, bubbles 2:1) and Clock (the iodine clock snaps to ink black). Bar v2.

- [x] Task 1: K5 lift from Marbling; lab light, glass, meniscus, rods (blockout)
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: electrolysis: signed scalar, both indicators, nucleation points, 2:1 rates, bubble lift, stir; seeded rainbow
- [x] Task 3: clock: mix fraction, progress, pour jet and level, the snap and its front, Reset
- [ ] Task 4: sound: fizz, hum, pour, clink, the snap; Q9
- [ ] Task 5: Bar v2 with per-chip slider label, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Task 1 rulings: commits go to main through tools/commit.sh (shared checkout, as the brief says), not a feature worktree. The slider runs 0 to 1; the toy relabels it and the key strip per chip through the DOM, since Bar v2 has no relabel call. The watchdog waits for Task 5.
- Dutch name draft: Labotafel. Tom sets it.

- Task 2 ruling: opening Electrolysis (page load or chip) shows the seeded rainbow; Reset gives fresh green indicator, so the bloom can be watched from the start.

- Task 3 rulings: m, p and the complex share one RGBA scalar texture with the electrolysis scalar. JS keeps a well-mixed estimate of p only to keep the loop awake through the snap (until 2.5). Liquid that is pure A or pure B never reacts, so an unstirred beaker can keep clear patches.
