---
# stimming-x3wl
title: 'Railgun: capital ship'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-12T08:44:39Z
updated_at: 2026-11-12T08:44:50Z
parent: stimming-ugc4
---

Build the enemy battleship target for Railgun. Spec: docs/plans/railgun-capital-ship.md. Plan: docs/plans/railgun-capital-ship-plan.md (8 tasks, subagent-driven).

## Checklist

- [x] Task 1: ship core (`railgun/ship.js`) and node tests
- [x] Task 2: Target setting and the target seam
- [ ] Task 3: the battleship in orbit; Tom checks the look
- [x] Task 3b: dev menu Target row and the ship's test shot (Tom, 2026-11-12)
- [x] Task 4: the hit, the wound and the breakup
- [x] Task 5: de-orbit and the re-entry streaks
- [x] Task 6: impacts, Reset and the next ship
- [x] Task 7: sound
- [ ] Task 8: reduced motion, full QA, review, PR

## Notes

- Tom, 2026-11-12: the ship draws a little larger than the spec's 4 degrees. He tried 12 and 9.5, then chose about 5.
- Now: about 5 degrees across (`SHIP_SCALE = 1.2`), 36 degrees up (`SHIP_EL`), 150 km out. `HULL` keeps its design units.
- Ship mode: the gun rests laid on the ship; Free aim reaches 50 degrees; the sight scale runs to 250 km.
- The cirrus draws in front of the hull, in the ship's own shader.
