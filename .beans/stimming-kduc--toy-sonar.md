---
# stimming-kduc
title: 'Toy: Sonar'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T15:00:00Z
updated_at: 2026-11-04T15:00:00Z
---

Build Sonar from docs/toy-dev-plan.md, section 2. Military realism: a red low-light phosphor console. It starts in the Lab.

- [x] Tube: K1 afterglow, bloom, barrel curve, scanlines, flicker, grain, red phosphor only
- [x] Active: ping front paints seabed clutter, contacts and acoustic shadows; tap pings a bearing, Space pings all round
- [x] Contacts: wreck, two fish schools, a wandering whale, a rare unknown; readouts as the front reaches them
- [x] Sonogram: LOFAR waterfall from the shared sea model; whale song, prop tonals, own hum, hull knock; drag tunes a cursor
- [x] Sound: ping, echoes timed to the front with Doppler, reverb tail, sea bed, whale, far prop, knock
- [x] Bar: Active and Sonogram, Range or Span, Ping or Knock, Shuffle; Settings: afterglow, screen, scanlines, grid
- [x] Menu Lab entry with icon and hook; toys.json entry (Dutch name is a draft)
- [x] QA: 1280 and 375 px, clean console, reduced motion, idle stop
- [x] Oscilloscope CRT stack, kept red; near-flat face that fills the stage; 30 Hz refresh
- [x] Cyrillic boot with a loading bar; Tom's recorded ping (higher for a beam ping)
- [x] Easter eggs: power ping, whale answers, sub counter-ping, tracks, cursor names lines, rare duck
- [x] Surface ships with wakes, a stalking enemy sub, and the Cranky Auntie («Сварливая тётушка»)
- [ ] Checkpoint: Tom reviews look and sound on a real device
- [ ] Record the session cost

## Notes

- The sonogram and the audio read one sea model, so what you see is what you hear, even when muted.
- Headless SwiftShader runs at 3 to 8 fps; a real-device fps check is still needed.
