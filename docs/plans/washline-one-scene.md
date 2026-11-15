# Washing line: one scene (proposal for review)

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
