---
# stimming-afnz
title: 'Toy: Canal at dusk'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:18:19Z
updated_at: 2026-11-09T08:14:54Z
---

Build Canal at dusk from docs/plans/canal.md. It starts in the Lab. A Flemish canal at blue hour in the rain: tap the quay lamps to light them; their reflections stretch across the water; a paper boat drifts through the light.

- [x] Task 1: K2 lift from Fireworks; facades, quay, bridge, belfry, sky, haze, mirror water
- [ ] Task 1: Q1, Q2, stills at three Dusk values in Dry at 1280 and 375 px; checkpoint with Tom
- [ ] Task 2: lamp picking, sodium warm-up, pools on wet cobbles, windows and TV flicker
- [ ] Task 3: rain lit only by light, ripple rings, chip easing, paper boat
- [ ] Task 4: sound: rain bed, lamp relay and buzz, carillon, wind; Q9
- [ ] Task 5: bar, Settings, persistence; Q1 to Q10
- [ ] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name (draft: Vaart bij valavond)
- [ ] Record the session cost

## Notes

- Bar v2 spec from the start: Weather segments, Dusk slider, Letterbox and Quality in Settings.
- Tom (2026-11-09): not a town canal; a rural Flemish in-between place ("Bevergem", marginal and ordinary). The set is now ribbon sprawl along a wide straight canal: towpaths, poplars on the near bank, terraces, lone houses with blank side walls, farmhouses, bungalows, a metal shed, empty lots, a plain concrete road bridge, the next village's church tower over the fields.
- Lamps are road lamps on steel arms over the towpaths: the sodium warm-up fits them.
- Task 1 stills sent; waiting on Tom before Task 2.

- Tom (2026-11-09): the bridge read awkward; he asked for a frietkot, church, staminee and station, and a sky eye view. The village now centres on a crossroads: a flat road bridge, a floodlit church on its square, a staminee on the corner with a red sign, a frietkot by the bridge, a small station on a railway line with cool platform lights. Six fixed lights (frietkot, staminee, station, church floods) share the lamp array after the ten tappable lamps. Sky eye is the default view; Settings > View keeps the towpath view.

- Tom (2026-11-09): more sprawl. Added side streets off the main road, two estates of fermettes and bungalows, an industrial street of sheds, field roads, five farms with yard lights. One road list feeds the ground shader and the ribbons. Sky eye pulls back; phones look along the main road over the bridge.

- Tom (2026-11-09): far more, from aerial photos. Studied Esri orthophotos of Beernem, Moerbrugge and Balgerhoeke. The plan is now generated: wandering old roads out from the centre, ring lanes, field lanes, 22 estates of cul-de-sacs, an old core of crooked wall-to-wall streets, an industrial zone by the canal, 16 farms, woods, hedgerow trees, a sports ground. A 2 m occupancy grid packs about 1,800 plots without overlap; a 2048 px painted ground map holds parcels, hedges, gardens, driveways and asphalt. About 250k triangles in one merged mesh.
