---
# stimming-tnjr
title: 'East Van Alley: bake the clouds, smooth the frame pacing, volumetric shadows'
status: in-progress
type: task
priority: normal
created_at: 2026-11-18T02:53:21Z
updated_at: 2026-11-22T10:44:12Z
parent: stimming-guw5
---


Carried over from stimming-2b59 (Tom, 2026-11-17).

- [x] Bake the clouds at five cloudiness levels (density field baked once; slide and relight per frame)
- [ ] Bake as much as we can for a big perf gain, judged live with Tom, one change at a time
- [ ] Smooth the frame pacing (30 fps drift, the cloud redraw every third frame, the car rebake)
- [ ] Volumetric shadows: A screen-space rays, B Railgun-style fitted blobs, C ray-marched haze on baked clouds. Recommended: bake clouds, then C at low resolution. Tom to pick.


## Notes (2026-11-22)

- Bake built: one R8 3D texture, 512 x 512 columns, 12 heights, 5 cover levels (0.11 to 0.35), about 15 MB of GPU memory. It bakes in about 15 ms at load.
- The noise lattice wraps every 400/9 km, so the field slides with no end. The seed joins the hash after the wrap; without that, every visit had the same broad pattern and 25 percent less cloud.
- The cloud pass falls from 2.9 ms to about 0.7 ms at 666 x 401 (ANGLE GL, headless).
- Tom (01:08): keep.

Tom (01:07), queued, one at a time:
- [ ] Post settings in Dev: the Post group has six; ask Tom which to add
- [x] Rendering polish ideas for Tom (listed; wire glints done in stimming-09z6)
- [x] Redo the shoes (done in stimming-bnbi)
- [ ] Splice case: the cable shows behind the near end, not through it (moved to stimming-bntl)


- 2026-11-22 (Tom: cheaper scrubbing): measured one scrub frame at 2 Mpx: rebake 1.3 ms and draw 2.0 ms (ANGLE GL), 2.3 and 4.0 ms (D3D11). No throttle needed. The real fault: a moving hour ran at the 30 fps drift rate. It now runs at full rate (59 fps while scrubbing, was 30); the loop returns to 30 fps once the hour settles.
