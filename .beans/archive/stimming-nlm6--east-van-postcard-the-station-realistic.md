---
# stimming-nlm6
title: 'East Van postcard: the station, realistic'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T06:11:52Z
updated_at: 2026-11-15T06:50:28Z
parent: stimming-guw5
---

Tom saw the realistic corner store (stimming-obwg) and asked for the station the same way.

- [x] Scene 4 on the realistic kit: real/station.js, same lens and plan as block-out card 10
- [x] Key 4 picks it; B flips to block-out card 10
- [x] Check at 1280 x 800 and 375 x 812; frame cost; clean console
- [x] Side-by-side stills to Tom
- [x] Commit and push

## Summary of Changes

`eastvan/postcard/real/station.js` is scene 4 on the realistic kit; key 4 picks it and B flips to block-out card 10. The realistic kit gained the tall-screen lens caps (`cam.upMax`, `cam.downMax`) that the block-out kit has.

- A subagent wrote it against `rkit.js`, two finished scenes and the block-out plan. It drew on its first load with a clean console. Then exposure, sky light and the shadow lift were raised from stills.
- The scene: box-girder guideway on piers, a canopied platform with tubes and windscreens, a glass stair hall with an escalator, a train with a lit interior, two articulated buses, a car, twelve figures (most under umbrellas), signals that cycle, a grocer with a real room, worn road paint on a mirror road.
- Six local lights; the near street lamp and the stair-hall light cast shadows. 66 materials, about 69k triangles.
- Frame cost at 1280 x 800: 14.6 ms on Standard, 28.8 ms on High.
- No new downloads.

Differences from the block-out card:
- The south row ends at x = 24, so the stair is in frame; the block-out hides it behind a building.
- The name board reads MOSSLIGHT JUNCTION (invented). The block-out board carries the real station name.

Verdict: this is the weakest of the four realistic scenes. The block-out reads brighter and clearer; the realistic one is darker, and its figures are small.

Not checked: reduced motion (by code only), real phones, frame rate with the block-out overlay open, the full 44 s loop in motion (stills only, at t = 18).
