---
# stimming-fx6b
title: 'Railgun: game over refine (ground crash, Requiem opening, 2.5 s white hold)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T18:22:13Z
updated_at: 2026-11-16T19:54:57Z
parent: stimming-f793
---

Tom (2026-11-16): refine the game-over ground crash; the Requiem (clear) loses its ah opening and layers in smoothly like the other layers; after the chorus ends on its bang, the frame holds 2.5 s on the white fill, then rewinds by itself. Follows stimming-hsym and stimming-jfy2.

- [x] Before stills of the crash
- [x] Requiem: no vowel opening; voices layer in smoothly
- [x] 2.5 s white hold, sound in step, then rewind
- [x] Crash look refined (first pass)
- [x] After stills, clean console, QA
- [x] Tom signs off by ear and eye (2026-11-16)

## Notes

- Crash: the strike's light follows seconds to contact (NEAR_T 5 s), not the fall share, so the frame stays readable until the last seconds. Contact: a white flash, a 0.5 s dark blink (BLINK_T) that thins the haze, a harder shake, the blast at full power; the burn then climbs to white.
- Requiem: the voices hold oo; the oo-to-ah vowel opening is gone, so voices only fade in, low to high.
- Timing: white full at +3.4 s after contact, held 2.5 s (WHITE_T), the chord fades over the held white, then the rewind runs.
- __qa.record(): taps kit.out for headless before/after clips.

## Round 2 (Tom, 2026-11-16)

Tom: the climax opened suddenly and ended at once; it must hold 3-5 s, then pop to a sudden silence, then the rewind. Cause: the Requiem's lock accent swelled the chord about 6 dB and decayed over 1.2 s.
- The accent is gone; the climax swells in (0.35 s time constant) and holds flat.
- CLIMAX_T 4 s after contact, the take cuts to silence in about 10 ms: chord, heart, echo and its own copy of the plain reverb (gameOverCut, surgeOverStop cut).
- Then WHITE_T 2.5 s of silent white, then the rewind.
- The wash is 4 s and its white is warm (FILL_WARM #fff1cf), after Tom's white-yellow note.
- Meter (headless): climax -9 to -12 dB RMS for 4 s, then -55 dB within 0.25 s.

## Round 3 (Tom, 2026-11-16)

Tom: no silent cut; the climax holds from 3 s before impact to 3-5 s after, then the orchestra stops dead on a forte pump with an echo; no oo to ah.
- The lock starts LOCK_T 3 s before contact.
- PUMP_T 0.3 s forte push, then the dry take stops; the echo and the reverb copy ring on.
- Meter: climax -8 to -9 dB RMS from about -2.5 s to +4 s, then the echo tail falls to -54 dB over about 3.5 s.

## Round 4 (Tom, 2026-11-16)

- The Requiem's code is the pre-day version again, with oo only (Tom: keep the new timing, fix the sound).
- The stop at CLIMAX_T silences the dry take and the feedback echo; a smooth hall tail (hallIR, 3.5 s) rings on, not echo repeats.
- Removed: the heartbeat and the synthetic contact boom (strikeBoom). Tom asked for no synthetic effects.
- goBus: the take's outputs; __qa.record('go') records the take alone.

## Round 5 (Tom, 2026-11-16)

- No accent at the lock: the climax ramps in over about 2 s (time constant 0.7 s). Tom: "much better".
- The climax holds CLIMAX_T 7.5 s (Tom: 2-3 s more than 5), then the hall tail; the silent white holds 2.5 s, then the rewind.

## Summary of Changes

- Crash: the strike's light follows seconds to contact; contact has a white flash, a dark blink and a harder shake; the wash is 4 s, warm white (FILL_WARM).
- Requiem: voices hold oo, no ah opening; no heartbeat; no synthetic contact boom; no accent jump at the lock; the climax ramps in over about 2 s and holds 7.5 s (CLIMAX_T); then the dry take and the feedback echo stop and a hall tail (hallIR) rings on.
- Timing: silent white holds 2.5 s (WHITE_T) after the climax, then the rewind.
- QA: goBus and chargeBus; __qa.record('go' | 'charge') records one sound alone.
- Tom signed off 2026-11-16.

- Tail: the hall tail rings about 6 s (Tom: "Yes", 2026-11-16).
