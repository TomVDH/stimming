---
# stimming-nl1y
title: 'Toy: Dijkstra'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T09:10:04Z
updated_at: 2026-11-09T10:50:10Z
---

Build Dijkstra flood from docs/plans/dijkstra.md. It starts in the Lab. Tap a node: light floods a Voronoi web in Dijkstra order; drag a target: the shortest path snaps on and re-routes. Raw WebGL2, Bar v2.

- [x] Plan: docs/plans/dijkstra.md
- [x] Task 1: Poisson sites, Delaunay, Voronoi web, faces (blockout)
- [x] Task 1: Dijkstra, wave clock, faces, edges, nodes, path, markers, bloom
- [x] Task 1: tap source, drag target, Space; Bar v2 shell; seeded first frame
- [x] Task 1: syntax, console, stills at 1280 and 375 px (round 1 sent)
- [x] Round 2: four webs (Cells, Streets, Circuit, Roots); Search moves to Settings
- [x] Round 2: demure, high-fidelity look (hairlines, muted ramps, hairline front, low bloom)
- [x] Round 2: stills sent; Tom asked for real streets
- [x] Round 3: OpenStreetMap fetch script; shaded night city (masks, bevels, shadows, water, light spill)
- [x] Round 3: first grabs and stills sent
- [x] Round 4: rename to Dijkstra; six searches; pins, long press, walls; Shuffle and Remap; shaded ground for all maps
- [ ] Round 4: cache 120 or more 2200 m grabs (fetch running)
- [ ] Round 4: checkpoint with Tom
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

- Round 2 (Tom, 2026-11-09): "different aesthetics: city grids, network / PCBs, natural networks", then "way too flashy; demure and elegant". Each web has its own generator, OKLCH ramp, ground and stroke style. Edges and the path use MAX blending, so joints do not bead. Pixel budget 4.2 M for hairlines.

- Round 3 (Tom, 2026-11-09): "realistic streets based on random OpenStreetMap grabs; cache at least 120" and "much better shading". Overpass (overpass-api.de) is at capacity, so the fetch runs about 45 s per city with backoff. Data is ODbL; the page credits OpenStreetMap.
