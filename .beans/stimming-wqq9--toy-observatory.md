---
# stimming-wqq9
title: 'Toy: Observatory'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-23T18:03:17Z
parent: stimming-oh7b
---

Idea 58 in docs/toy-ideas.md, group C. Tom picked it on 2026-11-16.

An old dome at night. Tap a star; the dome turns, the slit opens and the telescope slews.

Rough size: L (a guess; no plan yet).

- [x] Design approved by Tom (docs/plans/observatory.md)
- [x] Blockout, signed off by Tom (v2: woods and the complex, 2026-11-17)
- [x] Development plan in docs/plans/observatory-build.md (subagent-driven, Tom 2026-11-17)
- [ ] Build in the Lab
- [ ] QA at 1280 px and 375 px
- [ ] Tom's sign-off

## Branches merged on 2026-11-23

All four reach main through claude/obs-sim-integrate, which holds the other three.

| Branch | Holds | Where |
|---|---|---|
| claude/obs-cuts-6762ea | Cuts: reflector in the big dome, 30 fps blending, mirror shot with the disk wipe, thinner laser | On main |
| claude/obs-building-e2c560 | Classic dome holds the refractor and leads the pick; big dome holds the 1 m; clouds, relief | On main, through the cuts branch |
| claude/reverent-burnell-1c5f46 | Celestial selector and sky controls; passes the chosen dome to cuts.start | On main |
| claude/obs-sim-integrate | Simulator in the refractor's glass shot, the opening sweep | On main |

- [x] Integration on claude/obs-cuts-6762ea at 357658dd: builds, checks, 127 tests, captured (pushed)
- [x] Selector rebased onto the integration: claude/reverent-burnell-1c5f46 at 4c6cf1c1 holds building, cuts and selector; 153 tests (pushed)
- [ ] Tom's look at the integration
- [x] Simulator rebased onto the selector: claude/obs-sim-integrate holds building, cuts, selector and simulator (pushed)
- [x] The chain lands on main through claude/obs-sim-integrate, with main's newer commits merged in; 237 tests
- [ ] npm run check: fix the shared/flare.js type errors (also on main; not observatory's)
