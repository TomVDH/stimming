---
# stimming-ai1u
title: 'Gas giant: soft edges in the upper void (twister tops, horizon line, tower edges)'
status: in-progress
type: task
created_at: 2026-11-25T05:17:20Z
updated_at: 2026-11-25T05:17:20Z
parent: stimming-vxno
---

Tom, 2026-11-24: "alpha gradient cards masking out where there's hars edges". Tom picked three edges on the -20 km still: twister tops at the ceiling, the horizon line where the 25 km bake begins, tower edges in the middle distance.

- [x] Find what draws each hard edge (horizon: the far floor against the window-end fog, not the bake seam)
- [x] Twister tops fade into the ceiling
- [x] Horizon line goes soft: void samples melt into the window-end fog
- [x] Tower edges go soft: rim gradient and fray, ends fade
- [x] Before and after stills to Tom
- [x] docs/toys/gasgiant.md updated
- [ ] Committed and live on Pages

## Flipbook proof (Tom, 2026-11-24: "how expensive woudl a flipbook be here -- can we prove it")

`gasgiant/probe-flipbook.html` bakes the spike's backlit twister (3 varieties x 16 turn frames, 512x384, RGBA8) and draws the 14 twisters as cards. RTX 3070, 1279x1242: bake 499 ms, 36 MB, cards 0.02 ms a frame. The live twister march costs about 0.6 ms.
Round 2 (Tom: cards flat to the camera; top and bottom masked): 3 x 8 frames at 768x691 with mips, top and foot alpha gradients. Bake 447 ms, 65 MB, cards 0.06 ms a frame. Tom: "not quite good enough yet".
Round 3 (Tom: "can we use compression? 70mb almsot seems excessive"): frames keep light and alpha only; the card shader adds colour by height and the void's haze. The GPU encodes them to BC5 (RGTC2) at bake time, reads the blocks back and uploads them. 768x692 x 24 frames with mips: 16.3 MB, bake 484 ms, compression 108 ms, cards 0.14 ms a frame. The light path is darker (od x8), so bodies go dark and rims glow. A painted void backdrop stands behind the cards. Falls back to RG8 (about 33 MB) where RGTC is missing.
Round 4 (Tom: "better fidelity of the flip books -- slower rotation -- movre massive"): 1.5x girth, 1024x692 frames (32 px a km), 12 turn frames, real-time clock at half spin, the rope's light path doubled so its body goes dark, the void's greens, flashes that light the cards and the void. BC5 with mips: 32.5 MB, bake 950 ms, compression 194 ms, cards 0.04 ms a frame.
Round 5 (Tom: "alpha blend or warp them somehow to increase dnyamics ... the coloru blending could be a bit beteter"): the card sways (top most), a noise churn moves its edges, two scrolled copies cross-fade so the wall climbs (alpha flow), colour by light (slate-violet cores, pearl rims, floor green at the foot, ceiling green at the top). Cards 0.11 ms a frame; no bake change.
Round 6 (Tom: greener; "warp them alterally -- to make the funnels bend"): a slow S-bend per card, the foot fixed, up to 0.07 of the card width at the top, drifting over minutes. Jade cores, mint rims. Cards 0.08 ms a frame.

## In the toy (Tom, 2026-11-24: "into the toy as a dev mode option -- we are not done itertion on shaded or rendered")

- [x] Shared card code in twisters.js (`CARD_BAKE_FS`, `CARD_ENC_FS`, `CARD_GL`, `bakeCards()`); the probe uses it too
- [x] Dev, Twisters: Draw as live march or flipbook cards; Card light
- [x] Far bake depth at half cloud cover (Tom: "they seem all see throough"): a thin wisp no longer hides a twister past 25 km
- [ ] Tom's look at cards against the live march
