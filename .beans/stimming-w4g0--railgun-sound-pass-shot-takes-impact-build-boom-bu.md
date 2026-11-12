---
# stimming-w4g0
title: 'Railgun: sound pass (shot takes, impact build, boom bus, traverse motor)'
status: completed
type: task
created_at: 2026-11-12T07:48:39Z
updated_at: 2026-11-12T07:48:39Z
parent: stimming-f793
---

Sound pass on railgun/index.html, on branch claude/railgun-sound-3af021.

## Checklist

- [x] Shot sound setting: Report plus three synth takes (Mesa, Coil, Thump)
- [x] Impact prelude builds into the hit; levels checked against the boom
- [x] Boom: sub swell, rolling low tail; blast bus with a limiter (far crackle cut on Tom's word, 2026-11-12)
- [x] Traverse motor: whine follows slew speed, clunk at start and stop; stops on mute, sleep, hidden tab
- [x] QA: clean console, 30 fps
- [x] Note for Tom on comparing the shot takes
- [x] Tom (2026-11-12): boom bass trimmed about 3 dB; Mesa is the default shot take
- [x] Tom (2026-11-12): layered charge-up: Pentatonic and Hijaz stacks, Pentatonic default

## How to compare the shot takes

1. Turn sound on. Open Settings. Find the row **Shot sound**.
2. Pick a take. Each pick plays that take once, at full charge, while no shot flies. Pick the next take to hear it against the last one.
3. Fire a real shot to hear the take in place. The pick stays saved (`stimming.railgun.shotmix`).
4. Console: `__qa.take('mesa', 1)` plays any take at a charge level.

| Take | What it is |
|---|---|
| Report | Your `shot.mp3` cannon sample and its sub punch, as before |
| Mesa | A deep cannon: a dark blast, two sinking low tones, six mesa echoes and a ten-second rolling tail |
| Coil | An electric crack, a falling discharge, a ringing struck-bar barrel and the slug's N-wave supersonic snap with flutter |
| Thump | A heavy knock, a resonant pressure whoomp, a sub swell and three seconds of debris rattle |

## Layered charge (Settings, Charge sound)

- **Pentatonic** (default): A major pentatonic on A2. Order of entry: root, fifth, octave, third, fifth, sixth, two octaves, ninth, third, fifth, sixth, three octaves.
- **Hijaz**: an Arabic maqam on A2. The augmented second (B flat to C sharp), the flat sixth and the flat ninth enter in the middle. A slow vibrato is on every tone.
- Twelve tones enter one by one in step with the charge (entry at 0.03 to 0.86 of full). Each tone arrives with a soft chime an octave up. Full charge locks the chord with a swell; over-hold pulls each tone sharp or flat.
- The old mixes (Hum, Blend, Choir, Expanse, Titan) stay in the stepper.

## Notes

- Impact: the shot bus and its echo send dip 20 dB 1.6 s before the prelude. The whoosh then swells 18 dB with an opening filter, a riser and a sub climb, a 20 ms hush, then a crack and a knock on the flash.
- Blast bus: impact, boom, fire and rumble share one compressor (threshold -14, ratio 12, 30 ms attack). Master peak at Moon, charge 1.25: -1.6 dBFS. No energy above 2.5 kHz during the boom (-77 to -88 dB).
- Tom (2026-11-12): too much crackling. Removed the far crackle layer, halved the fire pops and darkened them, slowed the limiter, cut the sub swell.
- Motor: start above 0.1 of 6 deg/s, stop below 0.025; torn down 1.5 s after a stop.
- Frame rate matches the base build (30 draws/s; the same short dips at release and hit).
