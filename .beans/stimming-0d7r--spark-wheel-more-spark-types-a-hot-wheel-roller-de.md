---
# stimming-0d7r
title: 'Spark wheel: more spark types, a hot wheel, roller detail'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T05:47:02Z
updated_at: 2026-11-15T06:28:21Z
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
