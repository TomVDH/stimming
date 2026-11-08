---
# stimming-mku0
title: 'Toy: Wind farm'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-08T10:10:36Z
updated_at: 2026-11-08T11:04:37Z
---

Wind farm (`windfarm`, idea 59). Offshore turbines in sea fog; the Wind slider drives rotors, sea, fog and fog wakes.

Plan: `docs/plans/windfarm.md`. Framing: Beach walker, the cluster on the left third, a low sun right of it. Rendering: raw WebGL2 (Tom, 2026-11-08); K2 is a reference only.
D1 (Tom, 2026-11-08): Night viaduct broke on performance; K2 needs no look fix. Frame-loop rules and the performance ladder hold from the first commit.

## Checklist

- [ ] Blockout: sea, horizon, turbine cluster, sun patch and fog steps; stills at 1280 and 375 px; Tom signs it off (`windfarm/blockout.html`: three.js, three cameras, 16-step fog march with a 35 m sheet and a 72 m deck, red lights with fog halos, film grain; blue ACES grade; six cameras: Rows, Foot, Above, Across, Hub, Grid; fog banks keep a clear lane along row 0). Tom: develop in full (2026-11-08).
- [x] D1: Tom names what broke in Night viaduct
- [ ] Task 1: turbines in fog, raw WebGL2
- [ ] Task 2: wind, power curve, gust fronts, storm cut-out
- [ ] Task 3: fog wakes and synced night lights
- [x] Task 4: sound (wind bed, blade swish, sea wash, gust whoosh, cut-out hum); not heard by Tom yet
- [x] Task 5a: bar, menu Lab entry, toys.json\n- [ ] Task 5b: QA Q1 to Q10; Tom checks fps on a real device\n- [x] Tom round 1: fewer turbines (4 rows of 11), five fog sheets, lamps light the fog, more grain, always opens on Rows
- [ ] Record the session cost
