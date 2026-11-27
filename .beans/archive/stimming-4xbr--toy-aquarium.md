---
# stimming-4xbr
title: 'Toy: Aquarium'
status: completed
type: feature
created_at: 2026-11-22T12:18:48Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Lab toy, idea 362 (group F), batch 2. A planted tank you look into: sand, plants, clear water, a few bright fish. Tap the surface to drop food and the fish rise to it; tap the glass and they scatter, calm down and come back. MVP at high fidelity, Bar v3, icons from Tom's pick A of spike aquarium-1. Plan: docs/plans/aquarium.md. Toy doc: docs/toys/aquarium.md.

## Defaults chosen (Tom's open questions)

- 3D, stack type Scene (three.js 0.170). A fixed front view through the glass with a narrow lens; mouse hover gives a small parallax. Schools need depth to read as schools.
- Fresh water, a nature-style planted tank: carpet in front, two tall clumps of ribbon leaves, one short clump.
- Real fish, one school each: cardinal tetras (blue, low), ember tetras (orange, middle), lemon tetras (yellow, high). The colours match pick A.
- Presentation: no frame, no props. The stage is the water; the dark band at the top is the room above the waterline.
- Gestures: click the surface band to feed; click lower on the glass to knock.

## Checklist
- [x] Plan at docs/plans/aquarium.md
- [x] Reference photos: planted tank, cardinal, ember and lemon tetras
- [x] Blockout screenshot at 1280 x 800 (docs/qa/aquarium/blockout-1280.jpg)
- [x] Hero: food falls, the schools rise and feed
- [x] Hero: a knock on the glass scatters them; they calm and come back
- [x] Light: caustics, shafts, surface mirror, depth haze, fish shade, bloom
- [x] Sound: knock, food patter, nips, darts, pearls, water bed; muted by default
- [x] Bar v3 spec and copy
- [x] Frame loop: drift 30 fps, sleep at 60 s, hidden, reduced motion
- [x] Menu Lab tile from pick A with its GSAP hook; sheet GALLERY row
- [x] Intro emblem shared/emblems/aquarium.svg; toys.json entry; favicon
- [x] QA Q1 to Q10; frame times recorded here
- [x] docs/toys/aquarium.md
- [ ] Tom: look, listen, Dutch name (draft Aquarium /aːˈkʋaːrijʏm/)
- [ ] Record the session cost

## QA (2026-11-22, headless Chromium, ANGLE GL, dev PC)

| Check | Result |
|---|---|
| Q1 syntax | node --check on the four modules and the menu script: pass |
| Q2 console | Clean on the toy and on ?lab, with the tile hovered |
| Q3 captures | docs/qa/aquarium/: 1280, 375 x 812, 812 x 375, feed, knock, reduced motion, intro emblem, Lab tile |
| Q4 frames | Drifting about 30 rAF/s; 0 frames 62 s after the last input |
| Q5 hidden | 0 frames in 2 s |
| Q6 reduced | Clean; fish hold still; feed and knock answer slower; 0 frames once the food is gone |
| Q7 bar | 2 actions and 1 slider; 4 How rows |
| Q8 keys | F feeds, K knocks |
| Q9 sound | Context runs after a gesture, suspended at sleep |
| Q10 frame times | Feed then knock at 1280 x 800: median 16.7 ms, p95 16.8 ms (51 fish) |
