---
# stimming-jfy2
title: 'Railgun: game-over sound takes (Ascent, Requiem, Undertow)'
status: in-progress
type: task
created_at: 2026-11-15T05:57:04Z
updated_at: 2026-11-15T06:40:00Z
parent: stimming-f793
---

Tom (2026-11-14) wants options for the game-over hum and choir. Three new takes sit beside Surge in the Dev row Game over sound (?dev). Branch: claude/railgun-sound-9ad060 (Tom merges).

## Checklist

- [x] Ascent: an endless rising Shepard hum under the Surge choir; the rise lands on the root at the lock
- [x] Requiem: a sung minor chord over an organ pedal and a racing heartbeat; the heart stops at the lock, the chord turns major
- [x] Undertow: a sinking Shepard hum and a dark cluster bend down, then open into a bright chord at the lock
- [x] Surge and the other mixes play as before
- [x] Mute and the white's Reset stop every take; a hidden tab and a pick change use the same hard stop
- [x] QA: clean console, levels against Surge, a fast strike to the white with each take
- [x] Note for Tom on how to compare the takes
- [ ] Tom picks a take

## How to compare the takes

1. Open `railgun/?dev`. Turn sound on. Open the Dev sheet (the code bracket right of Settings).
2. Set **Rock** to Mountain, then step **Game over sound** to a take.
3. Turn on **Strike test**: the rock jumps to the horizon line and the strike starts. Add **Fast rock** to hear the whole fall in about 9 s instead of 86 s.
4. A pick stops the take that plays; the next strike plays the new one.

| Take | Hum | Choir | At the lock (1.5 s before contact) |
|---|---|---|---|
| Surge | A sub only | The pentatonic saw swarm, from a third of the way down | The swarm resolves gently |
| Ascent | A Shepard hum climbs from the horizon line, faster as the rock nears | Surge's swarm | The climb lands on the root's octaves and holds |
| Requiem | An organ pedal on A, and a heartbeat from 44 to 160 beats a minute | Eleven sung voices (oo to ah) on A minor, low to high, with vibrato | The heart stops; each minor third lifts to a major third |
| Undertow | A Shepard hum sinks; a sub sinks from E1 to A0 | A dark cluster that bends down a fourth | The bend lets go and the cluster opens into a bright open major chord |

## Levels

Output RMS in dB on a Mountain, two seconds at each nearness u (headless Edge):

| Take | u 0.1 | 0.3 | 0.5 | 0.7 | 0.85 | 0.95 | Burn peak |
|---|---|---|---|---|---|---|---|
| Surge | -55.5 | -48.1 | -30.9 | -24.2 | -18.1 | -14.5 | -2.0 |
| Ascent | -51.1 | -32.3 | -24.7 | -19.8 | -16.1 | -12.9 | -0.8 |
| Requiem | -49.6 | -31.5 | -25.3 | -18.5 | -16.7 | -14.7 | -2.7 |
| Undertow | -51.2 | -31.9 | -25.2 | -20.4 | -15.8 | -12.3 | +0.3 |

The meter reads `kit.out`, before the kit's master compressor.

## Summary of Changes

- railgun/index.html: surgeOver builds a take from GO_TAKES or a machine-free stack (goStack, goStackUpdate; the old code, split out). New: shepard and shepardStep (a Shepard hum), goAscent, goUndertow (SURGE.undertow, a bend and a sinking sub), goRequiem with requiemUpdate and heartbeat. Level knobs: GO_SHEP, GO_REQ.
- The Dev row Game over sound lists Ascent, Requiem and Undertow after Surge. Surge stays the default.
