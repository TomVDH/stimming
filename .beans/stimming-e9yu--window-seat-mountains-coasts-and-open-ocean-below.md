---
# stimming-e9yu
title: 'Window seat: mountains, coasts and open ocean below'
status: in-progress
type: task
priority: normal
created_at: 2026-11-10T08:47:55Z
updated_at: 2026-11-10T09:15:28Z
parent: stimming-w1nd
---

Tom wants more geography under the wing: mountain ranges with relief and snow, coastlines, open ocean.
Branch claude/window-terrain-a0002d; Tom decides on merge. A/B with ?land=0 (old) and ?land=1 (new).

- [x] Spike note: what exists, two or three directions, cost, towns and airports
- [x] Mountain belts: eroded ridges, snow by height and slope, rock and treeline
- [x] Low-sun cast shadows and a light parallax on peaks
- [x] Coasts from one height field: fjords, headlands, shelf colour, beach, surf
- [x] Ocean: swell normals, wind roughness, sun and moon glint paths
- [x] Towns and airports avoid sea and peaks; towns favour coasts and valleys
- [x] Screenshots: Noon, Golden hour, Midnight at Clear
- [ ] Tom reviews the branch and decides on merge

## Notes

- Direction A built: one elevation field (km) sets sea, shore, snow and light. Belts: ridged field at 170 km. Ridges: 7 octaves of eroded ridged value noise, about 3 km peaks.
- A soft shadow marches 8 taps toward the sun or moon, only near belts. A steep parallax march (10 to 24 steps) lifts peaks toward the eye.
- Relief sea level is 0.42 (about a third of the map is sea); the flat land keeps 0.3. index.html mirrors both, and beltField, for airports.
- Towns: per-pixel habitability (dry, low, gentle; coast bonus) scales density, roads and farm lamps. The deck town glow fades over open sea.
- Cost: within noise on the dev Mac (about +1 ms of a 16 ms cloudless frame at 1544 x 1036).
- ?land=0 old, 1 relief, 2 relief with parallax (default on the branch). ?x=km starts the flight further along: x=1960 has a fjord coast.
- Tom asked for the Ace Combat world map as an easter egg; declined (copied map). An original hidden world is offered instead.

## Ode world (Tom, 2026-11-10)

Tom asked for his favourite flight-sim world under the plane as a personal easter egg.
- window/ode.js: ten hand-traced continent outlines from Tom's reference map, rounded by corner cutting, baked into a blurred land mask (1024 x 588).
- Hidden: ?ode, or type the world's name on the page (again to fly home). No names, flags or text on screen.
- 4 km per map pixel; the flight starts at map (960, 638) and runs east along the central continent's southern coast.
- Coasts meander by noise at 70 and 22 km, so traced edges never run straight. index.html mirrors the field for airports.
- Seen at Noon and Golden hour (Clear): open sea, then a lake coast, then snowy ranges.
