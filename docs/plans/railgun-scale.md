# Railgun: true scale (spike)

Status: active · Bean: `stimming-tgis`

Tom, 2026-11-15: the wide view works with hacks; the cinematic views need real scale.
Branch `claude/railgun-scale`, cut from `claude/railgun-fx-f99e87`. The current look stays there.

## Goal

Every view agrees on one world: one curved planet, one far country, one air.
Scale reads from depth cues, not from bigger numbers.

## Non-goals

- No change to the gun, the near plain's look, the rock, the blast or the sound.
- No volumetric cloud layer in this spike. The card clouds stay.
- No new library. Raw GLSL inside the three.js scene.

## Stages

| # | Stage | What changes | Cost |
|---|---|---|---|
| 1 | One curved planet | A camera-relative drop, `d² / 2R`, on the plain, the far disc, the ranges and the clouds. R = 1,800 km. Every view sees the same horizon. | One line per vertex shader |
| 2 | Raymarched far country | The crescent ranges become one heightfield on the curved planet, drawn in one pass behind the near world. Ridged erosion detail holds on a long lens. | 60 to 110 steps on the horizon band |
| 3 | Physical aerial perspective | Rayleigh and Mie light along each far ray: blue fade, a warm forward glow toward the sun, transmittance on the sun's light. | A few exponentials per pixel |
| 4 | Stills and numbers | All eight views before and after at 1280 and 375; frame cost; console. | - |

## Approaches considered

- **Per-view hacks** (today): cheap, but each view needs its own haze cap and placement. Breaks as views multiply.
- **Full true scale**: a spherical planet mesh with LOD, logarithmic depth in every shader, Hillaire LUT atmosphere for every material, volumetric clouds. Right, but weeks of work, and it rewrites the approved look.
- **Hybrid (this spike)**: the near world stays; the planet curve is shared; the far country and its air become physical. The far pass draws behind everything, so no depth-precision change is needed.

## Risks

- Frame cost of the march on phones: Standard quality and the ladder's rungs cut the steps.
- The far pass and the meshes must not disagree: the crescent meshes go once the pass lands.
- `railgun/index.html` is shared with the sound and QA sessions: this branch merges only on Tom's word.

## Done

Tom sees all eight views before and after, and picks: keep, tune or drop.
