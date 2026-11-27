---
# stimming-rooe
title: 'Window seat: terrain variance, airports, final approaches'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:15:46Z
updated_at: 2026-11-09T08:34:47Z
parent: stimming-w1nd
---

Tom: terrain variance, airports on the ground, final approaches, world fidelity at performance.

- [x] Baseline frame cost at midnight on High
- [x] Terrain: forest, fields, hills with shading, rivers, lakes, coast
- [x] Water reflects the sky and the moon
- [x] Airports: runways, edge and centre lights, approach rows with the rabbit, apron glow
- [x] Planes on final approach: landing lights, beacon, strobes
- [x] Screenshots at midnight, dusk, dawn
- [x] Frame cost after

## Summary of Changes

- `shader.js`: `landBase` sets the land under the lights. Regions over tens of km: hill country, wooded belts, wet lowland. Ridged hills shade by their gradient. Rivers, lakes and a frayed coast. Snow on high ridges. Fine detail fades by pixel footprint.
- `landCover`: water reflects the sky (and aurora) by Fresnel, with a Beckmann glitter path for the moon or sun. Airport lights draw over it.
- Airports: edge, centre, threshold and end lights; approach bars with the sequenced rabbit; blue and green taxiway; floodlit apron, masts, terminal and beacon. Lights spread over an anisotropic pixel footprint, so they keep one pixel of energy.
- `index.html`: airports sit one per 60 km cell by an integer hash; a float32 mirror of the sea field keeps them off the sea. The nearest 8 go up as uniforms. Up to 12 planes ride 3 degree finals, land and roll out; landing lights face the cabin side.
- Reduced motion stops the rabbit, beacons and strobes.
- Cost on High at midnight (1984 by 1314, GPU throughput, alternating A/B): clear 2.34 to 2.46 ms, broken 2.53 to 2.60 ms. rAF median is 8.4 ms, the 120 Hz cap.
