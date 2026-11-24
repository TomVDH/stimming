---
# stimming-okof
title: 'Star catalog: black holes and the quasar in full fidelity'
status: todo
type: task
priority: normal
created_at: 2026-11-24T22:21:22Z
updated_at: 2026-11-24T23:45:13Z
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
