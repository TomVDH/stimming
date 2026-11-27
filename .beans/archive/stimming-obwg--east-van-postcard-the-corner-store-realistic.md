---
# stimming-obwg
title: 'East Van postcard: the corner store, realistic'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T05:28:59Z
updated_at: 2026-11-15T06:08:19Z
parent: stimming-guw5
---

Tom saw the realistic Drive (stimming-d1zm) and asked for the corner store the same way.

- [x] Scene 3 on the realistic kit: real/store.js, same lens and plan as block-out card 7
- [x] Key 3 picks it; B flips to block-out card 7
- [x] Check at 1280 x 800 and 375 x 812; frame cost; clean console
- [x] Side-by-side stills to Tom
- [x] Commit and push

## Summary of Changes

`eastvan/postcard/real/store.js` is scene 3 on the realistic kit; key 3 picks it and B flips to block-out card 7.

- A subagent wrote it against `rkit.js`, the two finished scenes and the block-out plan. It drew on its first load with a clean console. Then the night shadows were lifted in the lens pass, and the kit shrubs lost their flat shading.
- The store: lap-siding walls on both fronts, a clipped corner with the door, a real interior (shelves, counter, fridge, tubes), awnings, a lit box sign, OPEN neon, three upstairs windows with a TV room. Outside: bench and cat, flower buckets, fruit stand, ice chest, newspaper boxes, pay phone, bike, hydrant, stop sign.
- Six local lights; the shop spot and the street lamp cast shadows. 66 materials, about 158k triangles.
- Frame cost at 1280 x 800: 13.9 ms on Standard, 28.7 ms on High.
- No new downloads.

What still reads as fake: the sky is near black (stars barely show), the far houses are dark boxes, the street lamp throws the pole shadow onto the door.

Not checked: reduced motion (by code only), real phones, frame rate with the block-out overlay open.
