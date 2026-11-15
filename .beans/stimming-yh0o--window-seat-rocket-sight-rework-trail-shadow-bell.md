---
# stimming-yh0o
title: 'Window seat: rocket sight rework (trail, shadow, bell)'
status: completed
type: task
created_at: 2026-11-15T10:15:17Z
updated_at: 2026-11-15T10:15:17Z
---

Tom (2026-11-15): the rocket sight read as a lollipop: a straight violet column, a banded disc and a hard ring.

- [x] The trail shears in high winds and spreads with age, 5 km wide at most; its glow thins as it spreads
- [x] Below the Earth's shadow line the column is dim smoke, not a violet glow
- [x] A bell of exhaust behind the rocket above 50 km: three long frustums, so no rings; faint by day, full from dusk
- [x] The staging puff is one soft sphere, not four banded ones
- [x] The trail shader's sheet rim is softer and wider
- [x] Launches sit 220 to 320 km out and head about 50 degrees off the line of sight, 120 km downrange, so the whole climb fits the window
- [x] The ?event=rocket&at test hook launches abeam of the window
- [x] QA: Dusk and Noon frames, no console errors

## Summary of Changes

- window/index.html: trail builder for the rocket, launch placement and heading, path downrange 120 km.
- window/shader.js: softer rim on sheet trails.
