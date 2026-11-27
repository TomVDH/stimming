---
# stimming-wo1y
title: 'Ten seconds: Railgun''s smoke shader for the rocket plume'
status: completed
type: task
priority: normal
created_at: 2026-11-15T05:14:37Z
updated_at: 2026-11-15T05:24:12Z
parent: stimming-4wu3
---

Tom (2026-11-14): take a cue from Railgun's asteroid smoke tail for the rocket plume.

## Checklist
- [x] Bake Railgun's 3D Perlin-Worley volume (R billows, G fine Worley) in launch/
- [x] Exhaust: one continuous raymarched smoke train along the climb, as Railgun's main tail (replaces the puff billboards): 40 segments split by joint planes, radius and age per sample, coverage cut and fine erosion, light march with multi-scatter
- [x] GPU time per frame no worse than the puffs (about 8 ms vs 8 to 14 ms at 1280 px)
- [x] Ground clouds and flame stay as approved
- [x] Before/after stills to Tom; Tom said yes (2026-11-14)
- [x] Commit and push through tools/commit.sh

## Summary of Changes

The exhaust trail is one raymarched smoke train, built like Railgun's main asteroid tail, in place of the puff billboards. Railgun's baked 3D billow noise drives its shape. Ten seconds' dawn, sun, shadow line, flame light and wind drift stay.
