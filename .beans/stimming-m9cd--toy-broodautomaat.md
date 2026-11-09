---
# stimming-m9cd
title: 'Toy: Broodautomaat'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:15:30Z
updated_at: 2026-11-09T11:07:02Z
---

Build Broodautomaat from docs/plans/bread.md. It starts in the Lab. A bread vending machine glows alone at the edge of a dark Flemish village road at night: drop a coin, the carousel turns, a hatch opens on a warm loaf; cars sweep past; a fluorescent tube flickers with moths.

- [x] Plan: docs/plans/bread.md
- [x] Task 1: blockout: machine, drum, canopy, tube, road, fields, far land, sky; bloom, tilt-shift, grade
- [x] Task 1: toys.json entry and Lab menu entry with a pointer-reactive icon
- [ ] Task 1: stills at 1280 and 375 px; checkpoint with Tom
- [x] Task 2: coin, carousel, hatch, loaf glow, steam
- [x] Task 3: tube flicker, moths, passing cars with spot shadow
- [ ] Task 4: rain and wet road
- [ ] Task 5: sound
- [ ] Task 6: Settings, frame loop, sleep, ladder; browser-pane checks
- [ ] Tom sets the Dutch name and IPA
- [ ] Record the session cost

## Notes

- Task 1 stills sent to Tom (1280 and 375 px); waiting on his sign-off before Task 2.
- The wall behind the machine was cut: two slim posts carry the canopy, so the machine stands free.
- Bar v2 is wired with stub handlers; the sound toggle stays hidden (silent) until Task 5.

- Tom (2026-11-09): rebuild as the classic Flemish broodautomaat. Now a cream cabinet, a curved yellow hood with the word BROODAUTOMAAT, eight small doors over an eight-tier carousel, and a steel coin unit. The tube hangs under the hood's lip. New stills sent.

- Tom (2026-11-09): more sweeping and Coen brothers, cue from Beach walker. Now a dead-level long-lens shot down a straight road to the horizon, with a shifted lens for a low horizon, warm haze, a low moon sheen on the asphalt, horizon poplars, far sodium lamps and a Buoy Business flare on the tube. New stills sent.

- Tom (2026-11-09): look approved, with less flare and a quintessential Flemish village in the background. Flare gain cut to 0.14; a village of brick gables with a church, spire and lit clock now closes the road. Phones stand on the verge so the village and the machine share the frame.

- Tom (2026-11-09): horizon too empty; build Village edge next. Added willow lines, farms, a pylon line, wind turbines with red beacons and a second spire. Village edge is a second View in Settings: the machine against the blind gable of a terrace house under a sodium lamp, dead frontal.

- Task 2 (2026-11-09): a tap on the machine (or near it) buys; the carousel turns forward with a 2 % overshoot; the tier's door springs open with a warm glow and steam; a second tap takes the loaf and the door shuts with a bounce. Empty cells stay empty; the lamp turns red when sold out; Reset restocks tier by tier. Coin is key C, Space on the stage; + Car is key V (the shell matches e.key, so 'Space' cannot bind).

- Task 3 (2026-11-09): a tap on the tube or hood strikes it: dark, orange-pink ends, two to four starter tries, then it catches; the Tube slider sets how often it blinks or dies by itself. Moths orbit the hood, dive at the glass, scatter on a strike and land on the cabinet when the toy sleeps (60 s). Cars run both lanes (Belgian right-hand traffic) every 25 to 60 s or on + Car: dipped-beam spot with shadow, beam cones in the haze, headlight and tail sprites. Turbine beacons flash together. A NaN from the beam cone apex blacked the frame; the shader now guards it. Checked by stepped probe stills; the live loop is unmeasured because the pane was hidden.
