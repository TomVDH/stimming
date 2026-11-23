---
# stimming-5oab
title: 'Observatory: a classic dome for the analog refractor; the big reflector in the big dome'
status: completed
type: task
priority: normal
created_at: 2026-11-23T10:00:40Z
updated_at: 2026-11-23T20:32:00Z
parent: stimming-wqq9
---


Tom (2026-11-23): a smaller observatory on the complex takes our analog telescope; the big telescope goes in the big dome. Tom approved merging claude/modern-scope-3ce734 here. The dome the pick follows will depend on the selection in the overview (selector session).

- [x] Modern scope files brought over from claude/modern-scope-3ce734 at be1160fc (world/modern-scope.ts, viewer-modern.ts, scope-modern.html, build entry)
- [x] Classic dome at size 1.5 on its own pad is complex.main: analog refractor, laser, cuts
- [x] Big Keck-style dome is complex.big; it turns on its own; makeBigHero(d) builds its close model with the reflector at a 2 m class size
- [x] Door lamps for every dome
- [x] The laser draws after the mist and clouds and tests the scene depth itself
- [ ] Tom approves the look
- [x] Integrated with the cuts branch: hero.of(dome) gives each dome's close model; the big dome's model builds after the main one, so makeBigHero is gone
- [x] The selector session switches the cuts between the two domes (claude/reverent-burnell-1c5f46, 4c6cf1c1)


## Summary of Changes

A classic dome at size 1.5 holds the analog great refractor; the big Keck-style dome holds the 1 m reflector from world/modern-scope.ts at a 2 m class size. The selector binds the refractor to complex.main and the reflector to complex.big, and the cuts play on the chosen dome. The laser draws after the mist and clouds. Merged to main on 2026-11-23 with Tom's sign-off.
