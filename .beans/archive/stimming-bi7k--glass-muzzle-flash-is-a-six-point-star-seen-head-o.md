---
# stimming-bi7k
title: 'Glass: muzzle flash is a six-point star seen head on, not washed out'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:57:36Z
updated_at: 2026-11-03T21:02:25Z
parent: stimming-x6ef
---

Tom wants a six-point muzzle flash from the front, and less wash.

- [x] The star sits on the aim point, whole, facing the lens
- [x] Six clean rays: white heart, yellow rays, orange tips
- [x] The flash no longer whitens the frame and pane
- [x] QA at 1280 and 375 px, clean console
- [x] Commit through a private index and push

## Summary of Changes

- The flash now sits on the line from the eye to the aim point, so the view runs down the barrel and the whole star shows.
- The star has six straight, sharp rays. Each ray takes its own length and the star takes a new turn on each shot.
- Colour: white heart, yellow inside the rays, orange at the rims and tips.
- Less wash: lower ray and core levels, bloom lift 0.5 to 0.1, point light 34 to 12 and warmer, pane sheen cut and warmer.
- A narrow panel takes a smaller star.
