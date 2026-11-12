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
- [x] Tom (2026-11-12): traverse at minimal volume with rhythmic metal clanks
- [x] Tom (2026-11-12): layered charge-up, rebuilt as Surge and Surge Hijaz (THX-style), Surge default

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

## Surge charge (Settings, Charge sound)

Tom (2026-11-12): the first stacks were too musical; he wants bombastic, mechanical, hummy synth layers in the THX spirit. Rebuilt as Surge.

| Charge | Layer |
|---|---|
| 0 | Mains: a transformer hum, saw and square on A1 |
| 0.10 | Capacitor whine: climbs from 180 Hz to 4 kHz |
| 0.22 | Sub: A0 and A1, drops in hard at the lock |
| 0.32 | Swarm bass: four saw pairs from random low pitches |
| 0.48 | Swarm mid: eight saw pairs, wandering |
| 0.60 | Turbine: saw and noise throb, 3 to 18 times a second |
| 0.72 | Swarm high: six saw pairs |
| 1.0 | Lock: every swarm voice lands on its chord tone; swell |

- **Surge** (default): the swarm lands on a pentatonic chord. **Surge Hijaz**: it lands on a Hijaz chord (flat second, augmented second, flat sixth).
- The swarm filter opens from 600 Hz to 9 kHz with the charge; one soft clip drives harder with the charge and the over-hold.
- Level: about -26 dB RMS at the start, -12 dB at the lock; Expanse runs -26 to -15.

## Notes

- Impact: the shot bus and its echo send dip 20 dB 1.6 s before the prelude. The whoosh then swells 18 dB with an opening filter, a riser and a sub climb, a 20 ms hush, then a crack and a knock on the flash.
- Blast bus: impact, boom, fire and rumble share one compressor (threshold -14, ratio 12, 30 ms attack). Master peak at Moon, charge 1.25: -1.6 dBFS. No energy above 2.5 kHz during the boom (-77 to -88 dB).
- Tom (2026-11-12): too much crackling. Removed the far crackle layer, halved the fire pops and darkened them, slowed the limiter, cut the sub swell.
- Motor: the whine bed sits about 6 dB lower (-36 dB RMS); metal clanks alternate tick and tock (610 and 470 Hz, inharmonic partials), 1.5 a second at a crawl to 7 flat out, scheduled ahead of the frame. Start above 0.1 of 6 deg/s, stop below 0.025; torn down 1.5 s after a stop.
- Frame rate matches the base build (30 draws/s; the same short dips at release and hit).
