---
# stimming-4itb
title: 'Observatory: no laser, a quieter selector, Little and Big Observatory'
status: in-progress
type: task
created_at: 2026-11-23T21:43:47Z
updated_at: 2026-11-23T21:43:47Z
parent: stimming-wqq9
---

Tom, 2026-11-23: "get rid of the green laser altogether -- eliminate its code -- the selector too -- not quite on brand with bar v3 -- the selector laser and selecting a star or area of the sky -- needs to be more subtle -- also -- let's just have "Little Observatory" -- and "Big Observatory" as names -- lets keep the psuedo tech terms out of it until we are within the telescope".

Tom, 2026-11-23, on "the selector too": restyle it, not delete it.

- [x] Remove the green laser and its code: world/laser.ts, beamScene, tappedDepth, the opening's beam(), buildDome's laser flag, laserMouth on every dome and hero. altAzDir moves to sky/altaz.ts.
- [x] The cuts chat drops the laser lines from view/cuts.ts first: its edcf6da8 (claude/cutlab), applied here
- [x] Names: Little Observatory (classic dome) and Big Observatory (Keck dome). No pseudo tech terms before the viewer is inside the telescope.
- [x] Restyle the selector in the bar v3 look: corner ticks and the name on hover; bar v3 words on a lock; one faint hairline only on a word
- [x] Screenshot to Tom early; he approved the direction (docs/qa/observatory-pick/)
- [x] check:observatory and check:railgun 0 errors; 153 node tests pass
- [ ] Tom's sign-off
