---
# stimming-mhh2
title: 'Balloon letters icon: one shaded foil Ø'
status: completed
type: task
priority: normal
created_at: 2026-11-03T21:47:29Z
updated_at: 2026-11-03T21:51:52Z
---

Tom asks to redo the Balloon letters icon as one shaded balloon with the Danish Ø.

- [x] Draw one foil Ø balloon with volume shading on a curly ribbon
- [x] Hover: the balloon leans away from the pointer and bobs back (toys.balloons)
- [x] Update the luminance emblem at shared/emblems/balloons.svg
- [x] QA: menu loads, clean console, screenshots at 1280 and 375
- [x] Commit own hunks via private index and push

## Summary of Changes

- The menu tile is one gold foil Ø balloon with a tie knot and a curly pink ribbon. It replaces the two-letter HI.
- Tom picks the soft shading. An SVG filter builds the shade and the glow from the shape edge, so they follow the ring and the slash as one form. All filter values are in user units, so the look holds at each pixel density.
- Hover: the balloon turns about its ribbon end and leans away from the pointer. The lean is zero at the middle. On leave it bobs back with an elastic ease. Keyboard focus also leans it.
- shared/emblems/balloons.svg is the matching luminance emblem.
