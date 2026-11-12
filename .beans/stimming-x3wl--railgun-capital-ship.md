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
- [x] Task 8: reduced motion, full QA, review, PR
- [ ] Tom checks the look and the sound on a real device (Task 3's look sign-off rides on this)

## Summary of Changes

- `railgun/ship.js`: pure ship logic (states, hits, joint order, hulk fall, light), 16 node tests in `tests/railgun-ship.test.mjs`.
- `railgun/index.html`: a target seam (`tgt*`); the battleship in orbit; the kill, the wound and the breakup; the de-orbit streaks; landings, dust domes and the next ship; the ship's sound; Dev rows Target and Ship fires.
- `shared/stim.js`: an additive `button` row for settings and dev sheets.
- QA (headless Edge, D3D11): Q1 to Q10 at three sizes, rungs 0 to 3, both modes; bar-v2 102/102. Rock-mode Q4 fails on main too (the ember shed keeps the loop awake).
- Follow-ups: move the ship's voices onto the blast bus when `claude/railgun-sound-3af021` lands; two colon-joined comments at index.html ~7879 and ~8160.

## Notes

- Tom, 2026-11-12: the ship draws a little larger than the spec's 4 degrees. He tried 12 and 9.5, then chose about 5.
- Now: about 5 degrees across (`SHIP_SCALE = 1.2`), 36 degrees up (`SHIP_EL`), 150 km out. `HULL` keeps its design units.
- Ship mode: the gun rests laid on the ship; Free aim reaches 50 degrees.
- The cirrus draws in front of the hull, in the ship's own shader.
