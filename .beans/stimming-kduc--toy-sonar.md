---
# stimming-kduc
title: 'Toy: Sonar'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T15:00:00Z
updated_at: 2026-11-09T07:51:10Z
---

Build Sonar from docs/toy-dev-plan.md, section 2. Military realism: a red low-light phosphor console. It starts in the Lab.

- [x] Tube: K1 afterglow, bloom, barrel curve, scanlines, flicker, grain, red phosphor only
- [x] Active: ping front paints seabed clutter, contacts and acoustic shadows; tap pings a bearing, Space pings all round
- [x] Contacts: wreck, two fish schools, a wandering whale, a rare unknown; readouts as the front reaches them
- [x] Sonogram: LOFAR waterfall from the shared sea model; whale song, prop tonals, own hum, hull knock; drag tunes a cursor
- [x] Sound: ping, echoes timed to the front with Doppler, reverb tail, sea bed, whale, far prop, knock
- [x] Bar: Active and Sonogram, Range or Span, Ping or Knock, Shuffle; Settings: afterglow, screen, scanlines, grid
- [x] Menu Lab entry with icon and hook; toys.json entry (Dutch name is a draft)
- [x] Icon round (spike 18): five sonogram directions, all pointer-driven
- [x] Icon round 2: emblem-first redraws (porthole, stencil plate, bolder marks)
- [ ] Tom picks a Sonar icon; the pick goes on the menu
- [x] QA: 1280 and 375 px, clean console, reduced motion, idle stop
- [x] Oscilloscope CRT stack, kept red; near-flat face that fills the stage; 30 Hz refresh
- [x] Cyrillic boot with a loading bar; Tom's recorded ping (higher for a beam ping)
- [x] Easter eggs: power ping, whale answers, sub counter-ping, tracks, cursor names lines, rare duck
- [x] Surface ships with wakes, a stalking enemy sub, and the Cranky Auntie («Сварливая тётушка»)
- [x] Calmer audio, ghosting, sharper mask, brighter text, on-screen keycaps
- [x] Bearing (BTR) mode; passive fans on the scope; vaguer sub
- [ ] Sounder (echogram): built, parked by Tom 2026-11-04 (`SOUNDER = false`)
- [x] Dolphins, diving whale, bait schools, sub below the layer
- [x] Real MBARI MARS loops tried, then reverted by Tom: they did not work in the mix
- [x] Sonogram tied to the sea: no phantom prop; lines per contact with Doppler; sub motor and pump lines; whale by range; bearing tags
- [x] Quality in Settings: the shared Standard and High (bean stimming-gq7k); a change resizes live
- [x] Sound: you hear what you point at; Active plays ping and echoes only; shorter reverb; one-tone alarms
- [x] One target across modes (2× tap locks it); pings, knocks and enemy pings show on every display
- [x] Keycaps are the only legend: one cap per action, plain words; the bar how-to list goes
- [x] Listen replaces Sonogram and Bearing: drag aims the ear; the waterfall, a bearing strip and the sound follow its beam; a lock steers the ear
- [ ] Checkpoint: Tom reviews look and sound on a real device
- [x] Record the session cost

## Notes

- The sonogram and the audio read one sea model, so what you see is what you hear, even when muted.
- Headless SwiftShader runs at 3 to 8 fps; a real-device fps check is still needed.

- Session cost, rework of 2026-11-08 (sound, target, keycaps): billed on the plan, not in dollars. About 233k context tokens; 9% of the weekly limit used at the end.
