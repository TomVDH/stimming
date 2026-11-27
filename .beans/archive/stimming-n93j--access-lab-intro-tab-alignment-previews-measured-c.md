---
# stimming-n93j
title: 'Access lab: Intro tab alignment previews, measured (Centre, Bottom centre, Left)'
status: completed
type: task
priority: normal
created_at: 2026-11-25T17:30:29Z
updated_at: 2026-11-25T18:16:17Z
parent: stimming-0cau
---

Tom, 2026-11-25: "we have bottom centre, centre -- and centre text left aligned -- ensure all are clean, properly measured and aligned".

Trial in accesslab/panels/intro.js only. The port to shared/intro.js needs its own bean and Tom's yes. Related: stimming-b1si (desk leftovers).

- [ ] Bar words: Centre / Bottom centre / Left; a stored bl reads as bc
- [ ] Bottom centre: the Centre grid at the foot, clear of the tech tags by --g-m
- [ ] Left: one column centred on the axis, every line flush with the emblem; Rail out of the grid
- [ ] Measured origin: --origin and --origin-x from the badge centre
- [ ] Measure: three layouts x List / Line / Rail x six toys, inline, full screen, 375 x 812
- [x] docs/plans/access.md Intro row

## Summary of Changes

- Alignment words: Centre / Bottom centre / Left. A stored Bottom left reads as Bottom centre.
- measure() reads the boxes at rest. It writes --origin, --origin-x, --col-x, --foot-clear, --rail-x and --rail-y.
- Bottom centre: the Centre column at the foot, one --g-m above the tech tags or the motto.
- Left: one column centred on the stage; every line flush with the emblem. The access row adds no width, so the logo holds in List, Line and Rail.
- Rail follows the measured logo, or the name when a toy has no emblem.
- Fixed in passing: the sound line's flash used a transform and box overflow; the engine's fit read it as too wide and halved the copy in List (0.5x). Shadows draw it now.
- Checked: six toys (railgun, supercon, pop, meshball, fidget, fireworks) x 3 alignments x List / Line / Rail, inline; railgun and supercon at 375 x 812; railgun at full screen.
- Known limit: Rail at 375 wide has about 67 px for its words; the fit shrinks the copy to 0.9 in Centre and Bottom centre.
