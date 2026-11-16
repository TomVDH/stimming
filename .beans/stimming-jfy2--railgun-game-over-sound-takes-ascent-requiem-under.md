---
# stimming-jfy2
title: 'Railgun: game-over sound takes (Ascent, Requiem, Undertow)'
status: in-progress
type: task
created_at: 2026-11-15T05:57:04Z
updated_at: 2026-11-15T07:45:00Z
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
- [x] Round 2 (Tom: "way too crackly and filtered"; the build too slow, the peak in the wrong place, the ending off): no crush, no crackle bursts, open filters, a build across the fall, the hit at contact, a cut at the white
- [x] Round 3 (Tom: the chorus lasts 3 s longer; no rewind whoosh after the game over)
- [x] Round 3 arc (Tom): low layers filter in slowly; layers come on as the rock nears, with natural dynamics; the chorus is complete in the last 3 to 5 s; at contact a forte with higher layers, then an echoed stop
- [x] Requiem (Tom's favourite so far): each layer enters muffled and opens as the next blends in, on the Dev toggle Requiem layers open
- [ ] Tom picks a take

## Round 3

| Beat | Now |
|---|---|
| Build | Layers enter low to high by elapsed time; the chorus is complete GO_FULL (4 s) before contact (30 percent of the fall on a fast rock) |
| Dynamics | Slow 7 s swells (plus or minus 30 percent) that settle as the chorus fills; level and filter follow nearness^1.6 |
| Requiem pedal | Its lid opens from 150 Hz |
| Requiem layers | Each voice's lid opens from 250 Hz to 12 kHz as the next voices enter (Dev toggle; off keeps every voice clear) |
| Contact | Forte: the choir bus at 1.4x, sung ah, a high saw layer an octave over the upper chord, the boom; the heart stops |
| Stop | The chorus holds GO_HOLD (3 s) past the white's arrival, then cuts in 0.2 s; a 0.42 s feedback echo rings it out (Requiem) |
| Rewind | The game over's rewind has no whoosh; the Reset button keeps its whoosh |

## Round 2 timing (every take, Surge too)

| Beat | Before | Now |
|---|---|---|
| Fade in | Over the first third of the fall | Over the first tenth |
| Build | Linear with nearness; most of the fall is a sub | Nearness curve u^0.6; the choir's layers are all in by 60 percent of the fall |
| Resolve | 1.5 s before contact, soft and slow | At contact, full accent, quick glide, plus a deep boom (`strikeBoom`) |
| Burn | Crush drive and crackle bursts, up to 50 a second | Clean chord, swells 15 percent |
| White | The sound fades across the 1.4 s white | The chord cuts in 0.2 s as the white comes; its echo rings on |

Filters: the swarm opens from 1.8 kHz (was 600 Hz), the Shepard hums from 1.2 kHz (was 300 Hz), the Requiem pedal from 500 Hz (was 200 Hz).

## How to compare the takes

1. Open `railgun/?dev`. Turn sound on. Open the Dev sheet (the code bracket right of Settings).
2. Set **Rock** to Mountain, then step **Game over sound** to a take.
3. Turn on **Strike test**: the rock jumps to the horizon line and the strike starts. Add **Fast rock** to hear the whole fall in about 9 s instead of 86 s.
4. A pick stops the take that plays; the next strike plays the new one.

| Take | Hum | Choir | At contact (the lock) |
|---|---|---|---|
| Surge | A sub only | The pentatonic saw swarm, from the first tenth | The swarm resolves hard |
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

Round 2, the same meter. A late check had the burn peak at Undertow +4.3; GO_HIT and the swell then came down.

| Take | u 0.1 | 0.3 | 0.5 | 0.7 | 0.85 | 0.95 |
|---|---|---|---|---|---|---|
| Surge | -50.6 | -23.2 | -18.3 | -16.1 | -14.5 | -14.4 |
| Ascent | -33.7 | -22.4 | -17.9 | -15.7 | -13.1 | -12.8 |
| Requiem (before out 0.45) | -28.7 | -22.6 | -20.9 | -19.1 | -18.3 | -19.0 |
| Undertow | -33.8 | -21.6 | -16.6 | -14.4 | -12.4 | -12.2 |

Round 2 clips, after the compressor: no peak over -0.2 dB; burn clicks down from 136-252 to 1-26 in five seconds.

## Summary of Changes

- railgun/index.html: surgeOver builds a take from GO_TAKES or a machine-free stack (goStack, goStackUpdate; the old code, split out). New: shepard and shepardStep (a Shepard hum), goAscent, goUndertow (SURGE.undertow, a bend and a sinking sub), goRequiem with requiemUpdate and heartbeat. Level knobs: GO_SHEP, GO_REQ.
- The Dev row Game over sound lists Ascent, Requiem and Undertow after Surge. Surge stays the default.
