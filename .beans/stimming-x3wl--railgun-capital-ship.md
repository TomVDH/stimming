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
- [ ] Task 4: the hit, the wound and the breakup
- [ ] Task 5: de-orbit and the re-entry streaks
- [ ] Task 6: impacts, Reset and the next ship
- [ ] Task 7: sound
- [ ] Task 8: reduced motion, full QA, review, PR

## Notes

- Tom, 2026-11-12: the ship draws about 12 degrees across, three times the spec's 4. `SHIP_SCALE = 3` in `railgun/index.html`; `HULL` keeps its design units.
