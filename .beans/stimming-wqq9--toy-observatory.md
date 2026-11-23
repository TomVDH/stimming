---
# stimming-wqq9
title: 'Toy: Observatory'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-16T21:08:16Z
updated_at: 2026-11-23T17:01:42Z
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

## Branches in flight (2026-11-23)

All are pushed to origin. Main holds the building redo, the first cuts and the telescope work.

| Branch | Holds | Next |
|---|---|---|
| claude/obs-cuts-6762ea | Cuts: reflector in the big dome, 30 fps blending, mirror shot with the disk wipe, thinner laser | Integration branch: merges main, then claude/obs-building-e2c560 |
| claude/obs-building-e2c560 | Classic dome holds the refractor and leads the pick; big dome holds the 1 m; clouds, relief | Merged into the cuts branch |
| claude/reverent-burnell-1c5f46 | Celestial selector and sky controls; passes the chosen dome to cuts.start | Rebases onto the integration |
| claude/obs-sim-integrate | Simulator with the building's clouds, mist and relief | Rebases after the integration |

- [ ] Integration on claude/obs-cuts-6762ea: builds, checks, tests, captured
- [ ] Selector rebased onto the integration
- [ ] Tom's look at the integration
- [ ] Integration lands on main
