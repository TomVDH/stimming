---
# stimming-1f2m
title: 'Train Ride: clean far shores on the Walensee'
status: completed
type: bug
created_at: 2026-11-15T07:38:39Z
updated_at: 2026-11-15T07:38:39Z
parent: stimming-6z3j
---

Tom, 2026-11-14: the Walensee's far shore showed a pale smeared band on the Churfirsten cliffs and a bright seam along the waterline.

## Cause
Far from the line the shore distance comes from the coarse lake flag (route.png, rows some 50 m apart there). It spills onto the steep far shore, so the lower cliffs read as within 3 m of the water. landMat drops woods, rock and towns there, so the cliffs painted as plain pale meadow, and the strip at the waterline read as a bright seam.

## Fix
- landMat floors the shore distance by height above the column's lake level: (height - lake - 1.5 m) x 2. Ground 10 m above the lake is never within 17 m of it. Near the line the fine shore map already holds, so nothing changes there.
- The lap line fades once a pixel covers more than about a metre of ground, and past 760 m from the line.

## Checklist
- [x] A/B in the live page: lap line, water layer, mirror and rim light each switched off; only the land colour on the bank explains the band and the seam
- [x] Walensee at 66.5 and 68.05 km, afternoon, morning, night: woods and rock on the far cliffs, the seam faint
- [x] Lake Zurich at 24 and 28.9 km unchanged
- [x] 1280 and 375 px, 60 fps, no console errors

## Not done
- The mirror of the far shore in the lake is off at this distance by design of the shared water; the old jagged grey mirror blocks no longer show.
