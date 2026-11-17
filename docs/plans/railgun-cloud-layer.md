# Railgun: one depth-aware cloud pass

Status: plan, waits for Tom · Bean: `stimming-d6wc` (under `stimming-626s`) · Builds on [railgun-clouds-review.md](railgun-clouds-review.md), sections 4 and 8 (Tom approved 2026-11-16, 15:58).

## Tom's asks (2026-11-16)

| Time | Ask, in his words |
|---|---|
| 20:04 | "imagine a set of flat cloud layers over the scene" |
| 20:16 | "clouds in the distance be smaller, much smaller and a better realistic depth layering" |
| 21:41 | "redo the storm clouds and their distribution", "cloud bands to slowly drift" |
| 21:44 | "rim lighting on the card clouds and have their cores and masses darker" |
| 22:04 | "the storm clouds in the distance need reshapes and better graphics, also need to slowly drift" |
| 22:10 | "rim lighting that approaches the way raymarched clouds do it" |
| 22:13 | "attempt raymarched clouds (like we did for window seat) but of the regular variety" |
| 22:21 | "clouds don't properly occlude or layer on top of one another" |

## Why the clouds do not layer today

Every cloud draws on its own with no depth: storm cards or storm volumes, heap and middle cards, the trail. The fixed `BAND` table in `clouds/bands.ts` alone decides what covers what. A near storm and a far heap swap; two cards cannot cross. Card clouds also cannot show true perspective: they turn to the eye, their bases are flat cuts, and any edge by range draws an arc.

## The fix: one march for every cloud

One full-screen pass, at reduced resolution, marches each ray once through every cloud: the heap layer and the storms. The ray meets each cloud at its true distance, so occlusion, layering and perspective come out right by construction.

| Part | How |
|---|---|
| Module | `railgun/src/clouds/pass.ts` (the pass, its target, its composite) and `clouds/field.ts` (the cell list from the storm table). GLSL beside them. |
| Heap layer | A shell 1.6 to 3.9 km over the curved ground: cover map, round domes on cells, billows, after Window seat's deck. Reference: `docs/plans/railgun-cumulus.js` (the parked spike, round 2 look in `docs/qa/railgun-scale/cloud-volumes-1.jpg`). |
| Storms | One storm field (review, 4.1): cells with place, radius, top, age and type; a height profile per type; the same noise erodes them; anvils in kilometres, 50 km and more downwind. Window seat's tower march at true scale (review, 4.0). |
| One march | The ray steps through the layer's shell and every storm cylinder it crosses, in order of distance. Empty air is skipped by the cover map and the cell bounds. |
| Light | One model for all: Beer with a slow tail, powder, two phase lobes (silver lining), sky light on crowns; a sun tap march. Then the blast, the bolt, the rock and lightning, after the air. |
| Depth | The pass writes the first cloud's distance. Its composite writes that depth, so the gun, the rock, the fx and the ranges sort against the clouds per pixel. The trail stays under every cloud (Tom, 21:38). |
| Ranges | Rays stop at the far bake's per-pixel range distance (`world/farcountry.ts`, `uFarG`). |
| Drift | The cover map and the cells slide with the wind; the whole layer moves, storms slower. |
| Cost | Half resolution first; temporal reuse if needed; a bake of the storm band as the review's fallback (4.2). Target 30 fps on Standard. |
| Fallback | Dev row Marched storms (group Clouds); the cards stay until Tom approves, then retire. |
| God rays | Later, from the pass's own cover and cells, not card spheres. |

## Steps (one look from Tom between each; `tools/clouds-check.mjs` before each commit)

1. The pass with the heap layer only, and per-pixel depth. Stills at Time 0.72 and 0.3, wide and phone; frame time on and off.
2. The storms join the march as a cell field, at their current places.
3. Storm redo: shapes per type, anvils in kilometres, placement for the camera (review, 4.4).
4. Drift: layer and storms.
5. Blast, bolt, rock and lightning light.
6. Tom approves: the volume pass is the default; the heap, middle and storm cards retire.

## Lessons from 2026-11-16

- Card layers: 240 to 760 cards cost 250 ms frames and glitched; any card edge by range arcs.
- The light shafts took card spheres near the eye and shaded half the sky.
- Each fix moved a draw band and shifted other overlaps: one pass ends that.
