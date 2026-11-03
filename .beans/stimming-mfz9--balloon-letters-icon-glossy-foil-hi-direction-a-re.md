---
# stimming-mfz9
title: 'Balloon letters icon: glossy foil HI (direction A redo)'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:06:18Z
updated_at: 2026-11-03T20:15:22Z
---

Tom picks direction A (Foil) from icons/spike-2.html for Balloon letters, redone in the glossy menu style.

- [x] Redraw A as glossy foil letters on curly ribbons in the menu tile
- [x] Hover: letters lean away from the pointer and bob back (toys.balloons)
- [x] Luminance emblem at shared/emblems/balloons.svg
- [x] Set emblem for balloons in toys.json
- [x] QA: menu loads, clean console, screenshots at 1280 and 375
- [x] Commit own hunks via private index and push

## Summary of Changes

- The menu tile draws HI as filled puffy foil shapes: a gold metallic gradient, a dark seam band, the shared lit and rim gloss, a centre crease and one specular streak per bar.
- The ribbons stay curly, pink under H and teal under I, with a small tie knot.
- Hover uses enter, move and leave. Each letter turns about its ribbon end and leans away from the pointer. The lean is zero above a letter and peaks one letter width away. A lean toward the other letter stops at 3.5 degrees, so they never overlap. On leave the letters bob back with an elastic ease.
- The old pink g-balloon gradient leaves the shared defs; the tile carries its own.
- shared/emblems/balloons.svg is the matching luminance emblem: white letters, grey creases, black streak cuts, white ribbons. toys.json points balloons at it.
