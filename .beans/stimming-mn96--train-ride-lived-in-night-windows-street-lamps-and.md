---
# stimming-mn96
title: 'Train Ride: lived-in night windows, street lamps and better headlights'
status: in-progress
type: feature
created_at: 2026-11-10T10:51:43Z
updated_at: 2026-11-10T10:51:43Z
---

Tom, 2026-11-10: a subsession on the procedural buildings, their night windows, street lights and headlights. Belongs to Train Ride (stimming-6z3j). Branch claude/trainride-buildings-34be8d; PR to main.

## Checklist
- [x] Before stills and frame time (Bäch 28,960 and Zürich 4,200, night)
- [x] Night windows: lamp colours, curtains and blinds, sleeping houses, slow on and off, stairwells, shop floors
- [x] Street lamps on the mapped roads, each with a pool; agree with the far light points
- [x] Headlights: beams on the road and walls, no pop at path ends, spacing, day cars decided
- [x] Building form in Zürich: modern blocks with a flat roof and ribbon windows
- [x] After stills and frame time
- [ ] PR to main merged (Tom)

## Summary of Changes
- Windows: each house has a share of lit rooms; one in eight sleeps. Panes differ in lamp colour and cover. A few switch over 20 to 90 s. Blocks have stairwells, shop fronts with sign bands, and offices. The seed stays flat and quantised; houses still go dark past 600 m.
- Street lamps: about 1,500, placed in JS from the road map at the kerb, 34 m apart, where the town density passes a bar. Colours follow the far lights' sectors. The glow matches a far light's size and strength. The Linth motorway carries its own sodium lamps; the far layer's string is dark there.
- Cars: paths join into runs and get even points. One pace per lane, one slot per car. A smooth curve gives the heading. Bodies show by day (decision: yes, as plain boxes; one in eight is a van). A beam lies on the road; the six nearest cars light the house walls. Paths that leave the road map carry no cars.
- Zürich: three in five flat-roofed blocks are modern, at the same polygon count.
- Cars follow the OSM roads (Tom, 2026-11-10): each run point snaps to the middle of the painted road, found across it in the road map. The lane sits half way to the kerb. A run breaks where a lane on the shader's curve leaves the paint or the road leaves the map. Result: 0 of 25,952 lane samples off asphalt (798 before); 39 km of road carries cars.
- Frame time: no change within noise (17 to 25 ms before and after at 2077 x 1251, hidden pane, A/B in one session).

## Not done
- Courtyard blocks: a hole needs more polygons.
- Lamp and beam light on the land itself is an additive quad; the land shader is the main session's.
