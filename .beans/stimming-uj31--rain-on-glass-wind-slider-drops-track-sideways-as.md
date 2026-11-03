---
# stimming-uj31
title: 'Rain on glass: Wind slider, drops track sideways as on a bus window'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:48:53Z
updated_at: 2026-11-03T20:55:41Z
parent: stimming-848s
---

Tom: a wind option, so the drops trace and track sideways in arced, jagged ways, as on the side of a bus or a car.

- [x] Drop sprites and their lens offsets turn to face the path
- [x] Airflow field bends paths; slow drops sag; short jagged legs
- [x] Wind breaks loose smaller drops, more often; gusts come and go
- [x] Wind slider on the bar, default still; still air keeps today's rain
- [x] Wind sound, under the sound toggle
- [x] QA at 1280 and 375 with a clean console; screenshots for Tom
- [x] Commit through a private index and push

## Summary of Changes

- The bar has one main slider, Wind, default still. Still air keeps the rain as it was.
- An airflow field bends paths across the glass and shifts over time. Fast drops ride it; slow ones sag, so paths arc. At full wind some paths climb.
- Paths run in short legs of 14 to 46 px with sharp changes of course.
- Wind frees smaller drops, more often, in gusts. Top speed falls from 40 to 16 px per frame and braking firms up, so drops stop and start.
- Sprites and their lens offsets turn to the path, and a running drop draws a tail. Beads dry sooner in the wind.
- Rain also lands upwind of the glass, up to 35% of its width. The drop cap rises to 1600.
- Wind sound: slowed noise through a band that climbs with the slider, under the sound toggle.

Headless QA at full wind: 60 fps at 1280 and 375; clean console; 20% of path steps turn sharply; 12% climb; 1276 drops in Storm. Sound checked by values only.
