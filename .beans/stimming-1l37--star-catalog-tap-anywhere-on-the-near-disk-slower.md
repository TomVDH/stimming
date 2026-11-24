---
# stimming-1l37
title: 'Star catalog: tap anywhere on the near disk; slower flares scaled by size; a released star turns home'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T23:00:57Z
updated_at: 2026-11-24T23:04:13Z
parent: stimming-e35i
---

Tom, 2026-11-24: "the flare and tap interaction seems a bit buggy and it doesnt seem I can click anywhere on the surface facing the camera to have them emit -- we also want to improve quality and increase slowness of the effect as it propagates, somewhat commensurate with the body size"; "when pivoting or tilting the object in full star camera -- have it slowly go back to default camera pos when released".

- [x] A tap near a region or prominence answers there; elsewhere on the near disk a flare site starts under the hand; empty sky does nothing
- [x] Flare pace 0.75 / clamp(rsun^0.18, 0.8, 3.5)
- [x] Five strands per ribbon, three threads per arcade loop
- [x] A released star eases back home over about 3 s
- [x] Checked in the pane: a tap on the disk starts a site flare, a tap on sky does nothing, the turn-back measured
- [ ] Tom looks at it live

- [x] Face-on flares burn harder against the bright disk: ribbons up to 3.5 times, arcade 2.5, core 2.2, by how directly they face the eye; limb flares unchanged (Tom: "Yes, brighter")
