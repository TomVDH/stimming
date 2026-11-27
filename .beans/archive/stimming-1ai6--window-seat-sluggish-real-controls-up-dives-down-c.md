---
# stimming-1ai6
title: 'Window seat: sluggish, real controls; Up dives, Down climbs'
status: completed
type: task
created_at: 2026-11-15T11:15:40Z
updated_at: 2026-11-15T11:15:40Z
parent: stimming-w1nd
---

Tom, 2026-11-15, in the Vancouver chat: "the plane controls need too be more sluggish and realistic" and "pls havbe up key go down and down key go up like a real plane".

## Checklist
- [x] Up pushes the nose down; Down pulls it up
- [x] Roll: slower rate, longer lag, a 25 degree limit
- [x] Pitch: slower spring, a 5 degree limit
- [x] Climb rate follows the flight path: speed times the sine of the pitch
- [x] Check in the browser; commit on main

## Summary of Changes

- Pitch works as a yoke: Down pulls the nose up, Up pushes it down.
- Pitch: 5 degrees at full stick (was 6), a slower spring (0.7 rad/s, damping 0.9).
- Climb rate is physical: cruise speed times the sine of the pitch, about 22 m/s at 5 degrees (was 150 m/s). The path lags the nose by 4 s.
- Roll: 3 degrees a second at full stick (was 5), a 1.5 s lag (was 0.9 s), a 25 degree limit (was 30). The autopilot's steep turns stop at 25 degrees too.
- A bank still does not turn the plane; that is a separate question for Tom.
