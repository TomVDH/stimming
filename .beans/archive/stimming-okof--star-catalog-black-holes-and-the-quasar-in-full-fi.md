---
# stimming-okof
title: 'Star catalog: black holes and the quasar in full fidelity'
status: completed
type: task
priority: normal
created_at: 2026-11-24T22:21:22Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-e35i
---

Tom, 2026-11-24: "after the sub chat is done adding the other things we'd want to ensure our black holes etc are ramped up in fidelity and accuracy -- take a look at the event horizon one -- take a look at the galaxy black hole we have in there". Inspiration (Tom): https://github.com/MisterPrada/singularity and https://radiant-shaders.com/learn/event-horizon

Starts after the objects chat has added its objects (stimming-mhpz and the quasar stimming-vd4z).

- [ ] Study eventhorizon/ (lensed disc, photon ring, starlight arcs), galaxy/ (its black hole and Supermassive object, the lensing fix of 2026-11-09) and both inspirations
- [ ] Physically based lensing: geodesic or a good approximation, the shadow at about 2.6 Schwarzschild radii, a thin photon ring, the far disc arched over the shadow and a thinner arc beneath
- [ ] The disc: temperature falling outward, Doppler beaming (the approaching side brighter and bluer), gravitational redshift near the hole
- [ ] Sky and starlight lensing round the hole; the quasar's jet and disc in the same model
- [ ] Each hole's card facts stay true; frame times checked on the long lens and the far zoom
- [ ] Tom looks at it live

## Tom, 2026-11-24: the volumetrics come first

"the gh repo had some raymarching clouds and volumetrics in the black hole -- when are we addressing this". MisterPrada/singularity raymarches a volumetric accretion disc: cloudy, turbulent gas, lit from within and bent by the hole's gravity, not a flat painted disc. That is the core of this bean.

- [ ] Read MisterPrada/singularity's raymarch: how it marches the bent ray through a volumetric disc, its noise for the clouds, its lighting and step count
- [ ] A raymarched volumetric disc for Cygnus X-1, Sagittarius A* and the quasar: turbulent cloud density, emission hot near the inner edge, Doppler beaming, lensing along the march
- [ ] Frame time held near the toy's budget (the volume pass already runs at half size)

## Scope, Tom 2026-11-24: a light touch

"we will minimally add some volumetrics -- i like our current black hole -- we will just add a bit in for depth and fidelity". Keep the current holes as they are. Add a thin layer of raymarched volumetric gas over the existing disc for depth: a few soft cloud wisps that catch the disc's light and bend with the lensing, after MisterPrada/singularity's clouds. No rebuild of the disc, the shadow, the ring or the lensing; the earlier checklist items beyond the volumetric layer are optional, only if Tom asks.

## Built (2026-11-24)

The light-touch layer: soft wisps sampled along the bent ray in the hole trace, after MisterPrada's swirling band (one noise lookup, jitter). In one pass with the quasar's overhaul (vd4z), which shares the trace. Frame time at the full view about 7 to 23 ms with readback, pane hidden.
