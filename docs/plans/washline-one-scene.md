# Washing line: one scene (proposal for review)

Status: done · Bean: `stimming-d1vq`

Bean `stimming-d1vq`. Tom, 2026-11-15: can East Van and the multi-place iteration; make one incredibly high-quality new scene; review first. When it ships, the four places retire (git keeps them).

Nothing is built until Tom picks a concept and approves the spec.

## What this session taught

| Worked | Failed |
|---|---|
| Strong silhouettes against a lit sky | Mid-distance procedural buildings: boxes read as fake |
| Backlit cloth: the line's real hero moment | Stylised skies (anime gradients, sticker clouds) |
| Physical scattering: things fade into their own sky | Haze as a colour mix: hard lines, poor blending |
| A few hand-built props up close | Many small instanced props at every distance |

So the one scene keeps architecture close and few, and lets light, air and water carry the depth.

## Three concepts

### A. Cliff top, sea fog at sunrise
A pulley line from a weathered post by a dry-stone wall to a crooked fence post on a headland. Below, a sea of fog fills the bay; a lighthouse and far headlands rise out of it. The sun comes up through the fog, straight through the washing.

- **Hero close:** stone wall, posts, pulley, grass and thrift in the wind.
- **Depth:** raymarched fog layer lit by the low sun, physical sky, far headlands as silhouettes.
- **Why it can look real:** almost no architecture; fog, light and grass are shader work this toy already does well.
- **Risk:** fog quality is the whole shot; it needs a careful raymarch budget.

### B. Rain courtyard at night
A narrow stone courtyard in heavy rain. The line runs under a deep eave, sheltered; washing hangs still while rain sheets past. Warm windows, a dripping downpipe, wet stone that mirrors the light.

- **Hero close:** eave, wet stone walls, a window with steam, puddles with rings.
- **Depth:** rain in the air, wet glass, mist; the courtyard ends in a lit arch.
- **Why it can look real:** the shared library already has precip, water rings, wet glass and glow; night hides geometry and lets light do the work.
- **Risk:** a sheltered line moves less; the wind play is quieter.

### C. Stilt village at low tide, dusk
A line between two stilt houses over wet mudflats. The flats mirror the dusk sky; poles, nets and boats on the mud lead the eye to a far line of sea.

- **Hero close:** weathered stilts, a ladder, nets, a boat on the mud.
- **Depth:** mirror flats with ripples and channels, physical dusk sky, distant stilt houses as silhouettes.
- **Why it can look real:** reflections and a flat horizon give huge depth from little geometry.
- **Risk:** wooden houses up close need careful modelling to avoid the box look.

## Quality bar for whichever wins

1. One camera, composed like a still: the line and the backlit washing are the subject.
2. Physical sky and aerial perspective (`sr-atmo.js`, generalised), multisampling on.
3. Hero props modelled with care, not instanced boxes: bevels, wear, real proportions.
4. Soft sun shadows and ambient occlusion (three.js GTAO) in the near ground.
5. One grade pass (`shared/grade.js`): film curve, gentle vignette, grain.
6. Optional, needs Tom's yes: CC0 PBR textures (stone, wood, grass) from Poly Haven, with credits. Real textures lift close surfaces more than anything else.
7. Checks at 1280, 375 × 812 and 812 × 375; first frame within 1 s warm.

## Plan after the pick

1. Spec the chosen scene: shot, layers, light, motion, budget.
2. A grey blockout of the shot for composition; Tom checks it.
3. Light and air; then hero props; then the grade.
4. Retire the four places in one commit.

## Chosen: A, cliff top in sea fog at sunrise (Tom, 2026-11-15)

### The shot
- One camera at about 1.3 m, under the line, on a grassy headland, looking east over a bay at dawn. The washing stands against the sky, and the sun rises behind it (blockout, 2026-11-15).
- The line runs 7 m across the frame: from a weathered post beside a dry-stone wall (left, near) to a crooked fence post (right). Both posts carry pulley wheels.
- Fifteen metres past the line the headland ends at a cliff edge, 60 m above the sea.
- Below, a sea of fog fills the bay. Its top undulates and drifts.
- A white lighthouse stands on a far headland (about 1.5 km), rising out of the fog. Two more headlands fade behind it (3 and 7 km).
- The sun rises over the sea horizon, behind the washing.

### Layers, near to far
| Layer | Content | Method |
|---|---|---|
| Grass | Wind-blown grass, sea pinks, a few stones | Instanced blades with a wind shader, up to 40k |
| Wall and posts | Dry-stone wall, two posts, pulleys, a gate | Modelled meshes: stones with bevels, wood with cracks and lichen |
| Cliff edge | Turf lip, rock face falling away | Displaced mesh, rock shading |
| Fog sea | Volumetric fog slab, 0 to 45 m above the sea | Screen-space raymarch against scene depth, half resolution, lit by the low sun with forward scattering |
| Headlands | Lighthouse headland, two far headlands | Heightfield meshes rising from the fog, aerial perspective |
| Sky | Dawn sky, sun disc, thin high cirrus lit pink | The physical scattering model from Strangereal, generalised |

### Light and the Sun slider
- Left end: pre-dawn, the sun 4° under the horizon. Blue hour light; the lighthouse beam sweeps through the fog.
- Right end: sunrise, the sun 3° up, straight behind the washing. The cloth glows; the fog top turns gold; the beam fades out.
- Soft sun shadows; ambient occlusion in the grass and at the wall's foot.

### Motion
Grass and sea pinks move in the wind. The fog drifts and breathes. The lighthouse beam turns. A few gulls ride the updraft at the cliff edge. The washing plays as now: reel, unclip, + Piece, Release.

### Budget
- 60 fps on a desktop, 30 or more on a phone. The fog runs at half resolution with a depth-aware upsample.
- The first frame comes within 1 s on a warm load.
- Checks at 1280, 375 × 812 and 812 × 375.

### Build order
1. Grey blockout: terrain, cliff, posts, line and camera. Tom checks the composition.
2. Sky and fog: the scattering sky, the fog raymarch, the sun slider.
3. Hero props: the wall, posts, pulleys, grass, the lighthouse.
4. Grade, ambient occlusion, soft shadows; the phone frame.
5. Retire the four old places in one commit. Done 2026-11-15: the page has one place and no Place choice; `sr-atmo.js` became `atmo.js`.

### Open question
CC0 textures from Poly Haven (dry stone, weathered wood, rock, grass) would lift the near surfaces most. They need Tom's yes to download, with a row each in `washline/CREDITS.md`.
