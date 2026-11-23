---
# stimming-tqse
title: 'Toy: Wheat storm'
status: in-progress
type: feature
created_at: 2026-11-22T22:48:32Z
updated_at: 2026-11-22T23:30:00Z
parent: stimming-oh7b
---

Build Wheat storm (idea 21, group C, a cinematic diorama) as a Lab toy: an MVP at high fidelity, Bar v3. A ripe wheat field under a dark summer thunderstorm. Gusts roll across the field as bright and dark waves of bending heads; a tap calls a lightning bolt there: the strike lights the field and the clouds, the thunder follows after a delay set by distance, and the gust front from the storm flattens the wheat around it. Apart from Tornado alley: no tornado, no road, a different framing. Plan: docs/plans/wheat.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js), with instanced wheat heads.

- [x] Plan at docs/plans/wheat.md
- [x] Reference photos (wheat in wind, storm over a field, lightning)
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/wheat/01-blockout.jpg)
- [x] Hero moment: gust waves, the strike and its light, delayed thunder, the gust front
- [x] Sound: muted by default, finished
- [x] Bar v3 spec and copy
- [x] Icon round spike-wheat-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/wheat.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- 3D field and sky on a flat stage, raw WebGL2, five small programs. The camera stands still 4 m over open wheat and looks out level; the frame is shifted down, so the horizon sits 34% from the top; about 48 degrees across. Why: at eye height everything past 30 m packs into a thin band and the gust front hides there; from 4 m the waves and the ring roll across most of the frame, and the near heads still read one by one.
- A low evening sun from the left and a little behind, 9 degrees up, lights the wheat orange-gold under a slate storm deck, with a strip of clear gold sky at the horizon. Why: the reference photos (Wikimedia Commons, "Kansas Summer Wheat and Storm Panorama" and lightning over fields): sunlit gold wheat under a dark storm is the strongest picture of the subject.
- Apart from Tornado alley: no tornado, no road, no farm, a level look over open wheat, evening sun instead of a grey day.
- The storm deck is a volume with Fire's smoke shading (K3 lighting, Tom's ruling for every cloud), rolls across the view, a heavier core to the right; the strike lights it from within.
- Near heads (7.5 to 60 m) are instanced, 90,000 strips of 28 vertices with alpha to coverage in 4x MSAA; past that a canopy shader carries the same wind.
- Tap the field: a bolt lands there. Tap the sky: it leaves the cloud base there and lands 1.5 to 5 km out. Space or Strike: a random strike, 25 m to 2.5 km. Thunder after the distance over 343 m/s on the audio clock. The gust front runs out at 19 m/s and fades in 22 s. Slider: Wind.
- Flashing: at most two flashes a strike, one strike per 0.6 s; reduced motion gives one soft flash.

## QA (2026-11-22)

- Q1 node --check: five modules and the six menu scripts pass.
- Q2 console clean on the toy (tap field, tap sky, Space, slider), the phone view, reduced motion, the icon round and the Lab hover. Intro and monogram show the emblem.
- Q3 captures: docs/qa/wheat/ (01 blockout to 09 Lab tile hover).
- Q4 drift 31.5 frames a second; 0 frames 62 s after the last input. Q5 hidden: 0 frames in 2 s; back at 31 a second.
- Q6 reduced motion: no drift; a strike and its gust front play, then 0 frames.
- Q7 one action (Strike), one slider (Wind); three How rows. Q8 Space strikes.
- Q9 context running after the gesture, suspended at the end (also when far thunder outlasts the loop).
- Q10 Edge headless on D3D11, RTX 3070, during three strikes: frame median 8.0 ms, p95 8.1 ms at 1280 x 800; median 8.0 ms, p95 8.3 ms at 1920 x 1080 (the headless frame cap; no rung stepped down).
