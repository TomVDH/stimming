---
# stimming-yv6s
title: 'Train ride: passing train PBR shader'
status: completed
type: task
priority: normal
created_at: 2026-11-16T23:23:06Z
updated_at: 2026-11-16T23:41:42Z
parent: stimming-6z3j
---

Tom (2026-11-16): update the passing train. Keep the quad; give it a better shader.

- [x] Shared PBRL chunk: GGX specular, env Fresnel, bump helpers
- [x] Height field: panel seams, rivets, recessed doors, window gaskets, ribbed skirt
- [x] Materials by zone: paint, stripe, rubber, aluminium gutter, underframe; grime streaks
- [x] Reflections: sky, ground, and our own train's side with its windows
- [x] Bogies and underframe boxes with parallax
- [x] Roof gear silhouettes: pantograph, roof boxes
- [x] Cars with gangways; doors at the car ends
- [x] QA: noon, night, rain, fast; Zurich standing trains; 1280 and 375

## Summary of Changes

- PBRL chunk in trainride/index.html: ggxSpec, envF, bumpN, bumpFade.
- trainSide(): seams, rivets, gaskets, door recesses and skirt ribs as a height field; GGX sun and lamp specular; sky, ground and our own carriage mirrored; grime streaks; rubber; aluminium gutter; rain wets the paint.
- Cars of about 26 m with two-leaf doors at the ends and rubber gangways.
- Bogies, wheels and underframe boxes with parallax; a curved roof with cooling boxes and a pantograph.
- The quads span -2.5 to 2.7 m. QA param ?oppv= slows the oncoming train.
