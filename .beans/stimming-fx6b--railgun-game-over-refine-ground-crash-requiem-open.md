---
# stimming-fx6b
title: 'Railgun: game over refine (ground crash, Requiem opening, 2.5 s white hold)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-16T18:22:13Z
updated_at: 2026-11-16T18:45:11Z
parent: stimming-f793
---

Tom (2026-11-16): refine the game-over ground crash; the Requiem (clear) loses its ah opening and layers in smoothly like the other layers; after the chorus ends on its bang, the frame holds 2.5 s on the white fill, then rewinds by itself. Follows stimming-hsym and stimming-jfy2.

- [x] Before stills of the crash
- [x] Requiem: no vowel opening; voices layer in smoothly
- [x] 2.5 s white hold, sound in step, then rewind
- [x] Crash look refined (first pass)
- [x] After stills, clean console, QA
- [ ] Tom signs off by ear and eye

## Notes

- Crash: the strike's light follows seconds to contact (NEAR_T 5 s), not the fall share, so the frame stays readable until the last seconds. Contact: a white flash, a 0.5 s dark blink (BLINK_T) that thins the haze, a harder shake, the blast at full power; the burn then climbs to white.
- Requiem: the voices hold oo; the oo-to-ah vowel opening is gone, so voices only fade in, low to high.
- Timing: white full at +3.4 s after contact, held 2.5 s (WHITE_T), the chord fades over the held white, then the rewind runs.
- __qa.record(): taps kit.out for headless before/after clips.
