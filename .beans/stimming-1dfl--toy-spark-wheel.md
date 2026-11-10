---
# stimming-1dfl
title: 'Toy: Spark wheel'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-10T06:26:45Z
updated_at: 2026-11-10T08:03:46Z
parent: stimming-oh7b
---

Build Spark wheel from docs/plans/spark.md (rank 1 in docs/plans/fidgets.md). F5: yes (Tom, 2026-11-09). It starts in the Lab. A knurled wheel on a flint, close up: flick it and sparks spray, fork into stars, skid on a wet floor and cool to embers. K6 from Fireworks. Bar v2.

- [x] Task 1: wheel, flint, floor, rim light, first-frame embers (blockout); checkpoint with Tom
- [x] Task 2: K6 lift: three metals, forks, floor bounce, embers, contact light
- [x] Task 3: sound: knurl ticks and rasp, strike, pops, sizzle; Q9
- [x] Task 4: Settings, persistence, performance ladder; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Task 1 blockout built (2026-11-09): wheel with procedural knurl, flint, wet floor with a mirrored copy, rim light, smoke wisp, first-frame embers that start cooling when the intro leaves. Drag down spins the wheel; tap strikes; Space grinds; the contact light flashes with the spin. No sparks yet (Task 2). Waits on Tom's checkpoint.
- Ruling: the wheel turns one way on a ratchet. Drag down is the forward stroke; drag up does nothing yet (the pawl click comes with Task 3 sound). The plan says so now.
- Dutch name draft: Vonkwieltje. Tom sets it.
- The menu hover asks for shared/emblems/spark.svg and gets a 404, as Rubens tube and Beer pour do; the emblem is Tom's per-toy work.

- Task 1 passed Tom's checkpoint (2026-11-10: "Yes, build sparks").
- Task 2 (2026-11-10): K6 lifted from Fireworks and marked. Each spark is a chain of closed-form segments written once: flight, then a fork or up to two floor bounces (hot Ferro may split), then an ember. Later segments carry a future start time. Steel bursts come before the landing. The wet floor mirrors sparks at half strength. Tall stages turn the wheel toward the camera so the spray stays in frame. Checked with a throwaway probe (the pane was hidden): flick, grind, all three metals, phone; console clean. Live frame rate unchecked.

- Task 3 (2026-11-10): raw Web Audio on the kit, no Tone. Single knurl ticks below 26 teeth a second, then a noise rasp gated at the tooth rate. A scrape and knock when the thumb starts a still wheel. Pawl clicks on the back stroke, one each 16 px. Fork pops and wet-floor hisses are cued at launch and play when the sim clock reaches them, each kind rate-capped. Q9 passed in a probe: the context runs after a click and suspends once the sparks settle. Not yet heard by ear.

- Task 4 (2026-11-10): the ladder gains a third rung that halves the sparks; tall stages throw 60 % as many. QA: Q1 syntax clean (page and menu). Q2 console clean through flick, strike, grind, all metals and Settings. Q3 stills at desktop and 375 px. Q4 and Q9 in a probe: the loop stops and the context suspends after the last ember. Q7: two visible controls, three key rows. Q8: keys 1, 2, 3 pick the metal; Space holds Grind. Trails, Floor and Smoke survive a reload; the test keys were removed. Q5 and Q6 checked by code only: the pane cannot emulate reduced motion, and it was hidden. Q10 open: the pane was hidden, so Tom checks fps on a real screen.
- Cost: no dollar figure is readable on this plan. Planning the Fidget pool and building Tasks 1 to 4 ran in one session at about 420k tokens of context.
