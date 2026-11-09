---
# stimming-yaug
title: 'Toy: Bench'
status: draft
type: feature
priority: normal
created_at: 2026-11-09T07:29:16Z
updated_at: 2026-11-09T08:10:53Z
---

Build Bench from docs/plans/bench.md (D5: yes, one page, two chips). It starts in the Lab. One backlit beaker, two experiments: Electrolysis (a rainbow from acid to base, bubbles 2:1) and Clock (the iodine clock snaps to ink black). Bar v2.

- [x] Task 1: K5 lift from Marbling; lab light, glass, meniscus, rods (blockout)
- [x] Task 1: Q1, Q2, stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: electrolysis: signed scalar, both indicators, nucleation points, 2:1 rates, bubble lift, stir; seeded rainbow
- [x] Task 3: clock: mix fraction, progress, pour jet and level, the snap and its front, Reset
- [x] Task 4: sound: fizz, hum, pour, clink, the snap; Q9
- [ ] Task 5: Bar v2 with per-chip slider label, Settings, persistence; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Task 1 rulings: commits go to main through tools/commit.sh (shared checkout, as the brief says), not a feature worktree. The slider runs 0 to 1; the toy relabels it and the key strip per chip through the DOM, since Bar v2 has no relabel call. The watchdog waits for Task 5.
- Dutch name draft: Labotafel. Tom sets it.

- Task 2 ruling: opening Electrolysis (page load or chip) shows the seeded rainbow; Reset gives fresh green indicator, so the bloom can be watched from the start.

- Task 3 rulings: m, p and the complex share one RGBA scalar texture with the electrolysis scalar. JS keeps a well-mixed estimate of p only to keep the loop awake through the snap (until 2.5). Liquid that is pure A or pure B never reacts, so an unstirred beaker can keep clear patches.

- Task 4 ruling: plain Web Audio nodes on the kit's context, not Tone.js; fizz fires up to ~200 ticks a second and Tone objects per tick cost too much. Q9 passed: context running during play, suspended after the snap settled. The snap sound fires one delay after the pour begins, when an even mix somewhere first reaches p = 1.

- Task 5 QA (pane, 1024 px, 120 Hz): Q1 pass; Q2 clean console; Q4 0 frames idle; Q5 0 frames hidden; Q7 4 controls, 4 key rows; Q8 Space, S, R work; Q9 pass; Q10 current on: median 8.3 ms, p95 9.3 ms. Q6 (reduced motion) checked in code only; the pane cannot emulate it.
- Final review (fresh reviewer): fixed Space repeat scrolling the page, Space hold sticking on blur, a short hide silencing sound, the clock's stay-awake guess, fizz after the seed run, frame-rate-bound stir and pour. The clock now reads a 16-sample-per-block probe every tenth frame: it keeps the loop awake while the reaction moves (six delays at most) and fires the snap sound as the first blue-black appears.
- Session cost: not readable in dollars here (Ultra plan); about 335k tokens of context.

## Parked (2026-11-09)

Tom: not satisfied. Stashed: the Lab menu entry and its icon hook are gone. The page stays at bench/ and in toys.json, reachable by URL only. Open: Tom's verdict on what to change, the Dutch name, Q6 in a real browser.
