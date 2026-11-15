---
# stimming-78t1
title: 'Railgun: idle never sleeps while a rock falls'
status: completed
type: bug
priority: normal
created_at: 2026-11-15T06:02:29Z
updated_at: 2026-11-15T06:29:30Z
parent: stimming-f793
---

QA, 2026-11-14. The frame loop says it sleeps 60 s after the last input. It never does while a rock falls.

The falling rock sheds sparks (stepAst, shedSpark). Each spark pushes lastDeath forward. busy() reads simT < lastDeath, so it stays true.

Evidence (headless, RTX 3070): with ?sleep=3000 and no input, 120 draws in 4 s after 6 s idle. Default load: 120 draws in 4 s. Reduced motion skips the sparks: busy() is false and 0 draws.

Effect: an unattended tab renders 30 fps without end. The rock strikes, the game over runs, the rewind brings a new rock, and the loop repeats, with sound if it is on.

## Checklist

- [x] Tom picks: the rock freezes when the page sleeps, or keeps falling (freeze, as the frame loop's comment says; Tom asked for the fix)
- [x] Keep shed sparks out of busy(), or gate them on pace
- [x] Check ?sleep=3000: draws stop; a press wakes the page where it was


## Summary of Changes

shedSpark keeps lastDeath as it is. The rock's ambient embers no longer hold busy() true. Event embers (blast, fizzle, hulks) still count.

The page now does what the frame loop's comment says: it runs for 60 s after the last input, then sleeps. The rock holds where it is and moves on at the next input. A started shot, blast or strike plays to its end with no input.

Checks (headless, RTX 3070, ?sleep=3000 unless noted):
- At rest: busy() is false; 0 draws in 4 s; the rock holds.
- A mouse move: 60 draws in 2 s; the rock moves again.
- A full shot with no input: the hit lands, the Reset chip shows and glows, the aftermath plays, then the page sleeps.
- A strike with no input: 150 draws in 5 s; nearness climbs.
- Default sleep: 90 draws in the first 3 s; 0 draws in 4 s after 65 s.
- The console stays clean.
