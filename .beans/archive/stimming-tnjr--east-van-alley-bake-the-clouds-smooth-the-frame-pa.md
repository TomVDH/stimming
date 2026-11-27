---
# stimming-tnjr
title: 'East Van Alley: bake the clouds, smooth the frame pacing, volumetric shadows'
status: completed
type: task
priority: normal
created_at: 2026-11-18T02:53:21Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-guw5
---


Carried over from stimming-2b59 (Tom, 2026-11-17).

- [x] Bake the clouds at five cloudiness levels (density field baked once; slide and relight per frame)
- [ ] Bake as much as we can for a big perf gain, judged live with Tom, one change at a time
- [ ] Smooth the frame pacing (30 fps drift, the cloud redraw every third frame, the car rebake)
- [x] Volumetric shadows (done as Railgun-style sun rays on shared/clouds.js, stimming-slah): A screen-space rays, B Railgun-style fitted blobs, C ray-marched haze on baked clouds. Recommended: bake clouds, then C at low resolution. Tom to pick.


## Notes (2026-11-22)

- Bake built: one R8 3D texture, 512 x 512 columns, 12 heights, 5 cover levels (0.11 to 0.35), about 15 MB of GPU memory. It bakes in about 15 ms at load.
- The noise lattice wraps every 400/9 km, so the field slides with no end. The seed joins the hash after the wrap; without that, every visit had the same broad pattern and 25 percent less cloud.
- The cloud pass falls from 2.9 ms to about 0.7 ms at 666 x 401 (ANGLE GL, headless).
- Tom (01:08): keep.

Tom (01:07), queued, one at a time:
- [x] Post settings in Dev: Bloom added (stimming-fwnu, now on shared/glow.js, stimming-l30i)
- [x] Rendering polish ideas for Tom (listed; wire glints done in stimming-09z6)
- [x] Redo the shoes (done in stimming-bnbi)
- [x] Splice case: the cable shows behind the near end, not through it (moved to stimming-bntl)


- 2026-11-22 (Tom: cheaper scrubbing): measured one scrub frame at 2 Mpx: rebake 1.3 ms and draw 2.0 ms (ANGLE GL), 2.3 and 4.0 ms (D3D11). No throttle needed. The real fault: a moving hour ran at the 30 fps drift rate. It now runs at full rate (59 fps while scrubbing, was 30); the loop returns to 30 fps once the hour settles.


- 2026-11-22 (Tom picked C): first version of the cloud shafts. A quarter-size march to the cloud base meets the baked field toward the sun and takes the shaded Rayleigh and Mie scatter off the sky. Only the local contrast applies (loss minus its mip-4 blur), as a brightness change: the sky keeps its mean and its tint. Dev, Light, Cloud shafts 0 to 4, default 1. Cost 0.43 ms, with each cloud redraw. Result: physically faint from this eye point; at 4 the sky under clouds darkens but shafts barely read. Not committed: Tom wanted Railgun's shafts instead. Parked as a patch in the session notes; the work moved to shared/clouds.js (stimming-slah, PR #96, merged), which gives East Van Alley Railgun-style sun rays.
