---
# stimming-0d7r
title: 'Spark wheel: more spark types, a hot wheel, roller detail'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T05:47:02Z
updated_at: 2026-11-15T07:53:29Z
parent: stimming-oh7b
---

Tom (2026-11-14): more spark types, slightly more detail on the roller, slightly smaller, more pizazz, zany. He picked way 3: types that behave, plus a wheel that heats up and sheds the heat in a flare. Design: docs/plans/spark-zany.md.

- [x] Design doc approved by Tom
- [x] Plan written and approved (docs/plans/spark-zany-plan.md)
- [x] Task 1: smaller wheel, roller detail
- [x] Task 2: types table, tints, stepper
- [x] Task 3: the tricks in flight
- [x] Task 4: smoke per type
- [x] Task 5: the hot wheel
- [x] Task 6: the flare
- [x] Task 7: whole-page check

## Notes

- 2026-11-14: design doc written; a fresh reader checked it and raised five gaps. All five are settled in the doc as the builder's calls: the metals' flare, the smoke box (unchanged, soft side fade), flares with Smoke off, the glow per type, the life of floor bits. Waits on Tom's approval.

- 2026-11-14, built in seven tasks, one commit each (249ba28 to this one).
  - Checked through a timer-driven probe copy with six test sets (t1 to t6), each seen to fail first, then pass; all six pass together at the end.
  - Stills read at 1280 x 720, 375 x 812 and 812 x 375: rest, each type, heat at three levels, each flare kind.
  - GPU time for one frame, submit to done, at 1927 x 1037 on this Mac: Ice fog 6.0 ms, Sparkler flare 7.8 ms, Ferro flare 6.7 ms on the Standard grid; Ice fog 7.1 ms, Sparkler flare 8.3 ms on the High grid. Worst frame 15.5 ms.
  - The real page loads, takes key 5 (Comet), a grind and a tap with no error.
  - tests/bar-v2.html: 105 of 108. The three failures (narrow moves, narrow slider, values survive) are the same three as before this work; they are in the shell.
  - Not checkable in the pane: frame rate on a visible screen, sound by ear (the new thump), drag by hand, a phone, reduced motion (code review only).
  - Changes from the plan's start values are in the plan run's rulings: Comet arcs (loft) and throws about seven a second; Ice lift -3.2; comet trails are a faint haze; heat follows wheel speed; glow 2.2 at full heat with a knurl glow map; each type has a spark light colour.

- 2026-11-14, final review by a fresh reader: no Critical, six Important, four Minor. One fix pass, each fix with a test seen to fail first (set t8, nine checks); t1 to t6 and t8 all pass after it.
  - The flare's thump played nothing; it now plays through the page's own `play()`.
  - Sparkler's star stopped at the fork cap (610 children); a flare now has its own fork budget (1800).
  - A flare under reduced motion was full size; it now has shorter sparks and no deep forks.
  - Comet and Popcorn gave no spark on most clicks; a strike now owes one spark.
  - Comet's light, flame and fireball were near zero, because they followed the spark rate; sparse types now follow the wheel speed, and a thin smoke type still feeds a flame.
  - Confetti left the frame before it fluttered; shorter first flight, a loft of 3.
  - The count rule for sparse types now reads the type's own `n`, so reduced motion and the ladder's last rung do not turn a metal into a now-and-then type.
  - Left for later (minor): Confetti runs the smoke sim on nothing; a hard flick on Sparkler can overwrite live sparks; some code comments break the one-fact, twelve-word rule.

- 2026-11-15, two review leftovers fixed, test set t9 (seen to fail first: Confetti started the smoke sim; a hot Sparkler grind with two flares overwrote 108 unfinished segments in 2 s). t1 to t6, t8 and t9 pass.
  - A type with no smoke and no flame (Confetti) starts no smoke sim; smoke that already hangs keeps its life. An empty puff does not wake the sim.
  - writeSpark() skips a slot whose segment has not ended, and drops the new spark when 64 slots in a row are live. A dropped spark has no sound, smoke or children.

- 2026-11-15, Tom: "change camera angle to sth better, reduce volume of fx significantly". Test set t10 (seen to fail first), then t1 to t6, t8, t9 and t10 pass.
  - Camera: low, near the floor. Wide: yaw 0.6, aim(30, -0.4, 10.4, 0.05, 0.27). Tall: yaw 1.15, aim(34, 0.9, 14.4, 0.75, 0.3). Wheel size on screen is the same. Stills read at 1280 x 720, 375 x 812 and 812 x 375.
  - Sound: every source goes through one gain, LEVEL 0.3 (about 10 dB down). I read "volume of fx" as sound loudness. Not heard by ear.

- 2026-11-15, Tom, three steps: "pbr the flint and improve its stand ... table lighter art deco", then "arced space age arm, more atom style, change environment a little, make less industrial", then "wtf are the atoms in the axis, sweeping arm integrated with base". Test set t11 (seen to fail first); t1 to t6 and t8 to t11 pass.
  - Final: one swept turquoise enamel body (two cheeks and the foot between them, clear coat) from the floor round the back and over to the axle; a fluted brass column holds the flint; brass ball caps on the axle; two brass inlay rings in each roller face. The hex nuts are gone (this replaces the design doc's nut).
  - The flint is a ferro rod: metal 0.9 with a drawn-line roughness map. Brass, chrome and the enamel each take their own share of the room's reflection (a material's own map skips the scene's 0.15).
  - Rejected by Tom on sight: orbit rings and electron balls at the axle (my wrong read of "atom style"); a hoop arm that stood on a stepped plinth.
  - Room: dark teal background, turquoise backdrop glow, teal tabletop, a cream rim light.
  - Name clashes met: mix (TSL) and body (the blackbody ramp); the new names are quiet and shell.
