---
# stimming-jgok
title: 'Menu: Kaleidoscope icon colours random per load'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:35:00Z
updated_at: 2026-11-03T20:40:51Z
parent: stimming-5a8x
---

The kaleido tile in root index.html picks fresh glass colours on every page load, in the glossy set style.

- [x] Random petal gradients per load
- [x] QA the menu at 1280 and 375 px, clean console
- [x] Commit through a private index and push

## Summary of Changes

- On each load the menu script sets the three petal gradients to a random triad: a random base hue, steps of 120 degrees with up to 25 degrees of jitter, in a random direction.
- Each gradient keeps the glossy recipe: a light top stop and a deeper bottom stop 25 degrees round. Yellows and limes get more light.
- The cream pips, the centre hex, the lit and rim overlays and the hover loop do not change.
