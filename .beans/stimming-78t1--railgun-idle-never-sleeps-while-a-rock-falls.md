---
# stimming-78t1
title: 'Railgun: idle never sleeps while a rock falls'
status: todo
type: bug
created_at: 2026-11-15T06:02:29Z
updated_at: 2026-11-15T06:02:29Z
parent: stimming-f793
---

QA, 2026-11-14. The frame loop says it sleeps 60 s after the last input. It never does while a rock falls.

The falling rock sheds sparks (stepAst, shedSpark). Each spark pushes lastDeath forward. busy() reads simT < lastDeath, so it stays true.

Evidence (headless, RTX 3070): with ?sleep=3000 and no input, 120 draws in 4 s after 6 s idle. Default load: 120 draws in 4 s. Reduced motion skips the sparks: busy() is false and 0 draws.

Effect: an unattended tab renders 30 fps without end. The rock strikes, the game over runs, the rewind brings a new rock, and the loop repeats, with sound if it is on.

## Checklist

- [ ] Tom picks: the rock freezes when the page sleeps, or keeps falling
- [ ] Keep shed sparks out of busy(), or gate them on pace
- [ ] Check ?sleep=3000: draws stop; a press wakes the page where it was
