---
# stimming-nl1y
title: 'Toy: Dijkstra flood'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:10:04Z
updated_at: 2026-11-09T09:21:46Z
---

Build Dijkstra flood from docs/plans/dijkstra.md. It starts in the Lab. Tap a node: light floods a Voronoi web in Dijkstra order; drag a target: the shortest path snaps on and re-routes. Raw WebGL2, Bar v2.

- [x] Plan: docs/plans/dijkstra.md
- [x] Task 1: Poisson sites, Delaunay, Voronoi web, faces (blockout)
- [x] Task 1: Dijkstra, wave clock, faces, edges, nodes, path, markers, bloom
- [x] Task 1: tap source, drag target, Space; Bar v2 shell; seeded first frame
- [ ] Task 1: syntax, console, stills at 1280 and 375 px; checkpoint with Tom (stills sent, waits on sign-off)
- [ ] Task 2: scouts, sparks, queue shimmer, path snap; mud brush
- [ ] Task 3: Seek (A*) and Race
- [ ] Task 4: sound: pops, lock chord, blips; Q9
- [ ] Task 5: Settings, frame loop, watchdog; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Lichtvloed)
- [ ] Record the session cost

## Notes

- Task 1: the web builds in about 9 ms at 1280 px (Node). Guard sites ring the margin box, so edge cells have no holes.
- Deviation: tap always sets the source; drag moves the target. The first frame already has a target, so a second tap re-floods rather than placing a target.
- Scouts, meeting sparks and queue rings are already in the blockout; Task 2 tunes them.
- Seek and Race fall back to Flood until Task 3. Clear stays disabled until mud lands (Task 2).
- Stills came from a throwaway probe page (pane hidden); the probe is deleted.
