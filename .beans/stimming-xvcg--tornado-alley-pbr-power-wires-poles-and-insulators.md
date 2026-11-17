---
# stimming-xvcg
title: 'Tornado alley: PBR power wires, poles and insulators'
status: completed
type: task
priority: normal
created_at: 2026-11-17T08:19:31Z
updated_at: 2026-11-17T08:24:21Z
parent: stimming-dwwg
---

Tom: "PBR the power wires" (via the lead, 2026-11-17). Conductors as weathered aluminium cylinders: a thin highlight that tracks the sun and sky, dark against bright sky, bright against dark cloud. Wood poles with roughness and AO, cross-arms, glass insulators with a small glint. Sub-pixel wires drawn with true coverage: no aliasing, no crawling.

- [x] Wires: anisotropic sun highlight, sky and ground reflection, coverage by slope
- [x] Poles and cross-arms: round wood shading, grain, AO at the foot
- [x] Insulators with a glint (glazed porcelain: glass bells read as black dots)
- [x] Stills, perf, commit

## Summary of Changes

line.js: wireShade() (aluminium cylinder: four-normal sky and field reflection, a sun highlight from the best normal across the wire), woodShade() (round post, grain, darker foot), porcelain insulators, segCover() and slope-true wire coverage. Frame cost within noise of main on a shared GPU. Commit 598fc6ff.
