---
# stimming-hdtz
title: 'Tornado alley: model the pickups, chasers and trees'
status: completed
type: task
priority: normal
created_at: 2026-11-17T16:13:07Z
updated_at: 2026-11-17T21:29:02Z
parent: stimming-dwwg
---

Tom, 2026-11-17: "model the pick up trucks and the trees". The vehicles and trees read as real objects, not blockouts.

- [x] Baseline frame cost: three F4.5 (headless A/B against main on port 8000; the GPU is shared, so only same-run pairs compare)
- [x] Pickup: cab, bed, wheel arches, roof, bumpers, mirrors; lit by sun, sky and haze (waits for Tom; three F4.5 flat, +5 ms only while the pickup fills the frame)
- [x] Chasers: real silhouettes, roof rack and light bar (wagon and high-roof van; hulls and parts as data tables, cold compile 9 s against main's 12 s)
- [x] PBR shading on all three, and a dish on the van (Tom, 2026-11-17: "lets PBR them and put a dish on the van")
- [x] Tom approves the vehicles (2026-11-17: "Yes, do the flare")
- [x] Near trees (infra, plain lone trees): crowns with volume, trunk, branch gaps, self-shadow, sway
- [x] Farm windbreak trees
- [x] Far trees and shelterbelts
- [x] Destruction: trees uproot whole past about 84 m/s; near trees fly into the funnel and fade out there, far ones fade in place (seen headless with a tornado through test trees and the farm windbreak)
- [x] Tom approves the trees (2026-11-17: "this toy is currently good to go for future iterations later")
- [x] Frame cost flat, console clean
- [x] Commit through tools/commit.sh with this bean

## Found on the way (pre-existing, fixed in the pickup pass)

- vSpray called hazed() with the plume's direction even at zero alpha; hazed() sets up the pixel's air once, so black streaks showed at the horizon round any vehicle under 3 m/s.
- vPart returned the cab hull's id 2 for painted panels, so cab bodies shaded as dark glass (the van read black). Fixed for the pickup; the chasers get it in their pass.
- Vehicles past 60 m drew before the line and the fence, so poles and posts beyond them painted over them. Far vehicles now draw after plain().

## Trees (2026-11-17)

Tom: "taller poplars or conical ones with some deciduous around -- bushes -- hedges -- low poly but well PBR'd"; "have tree crowns kind of have rim lighting w sun direction responding to it". loneTree() now draws elms, poplars and cedars with low-poly facets and a sun rim; one function serves the lone trees, the farm windbreak, the farmstead trees and the far trees. Destruction logic is unchanged (the same treeDmg() drives lobes, gaps, snap and fall); checked only by reading, not with a live tornado.

- [x] Bushes and hedges: moved to their own bean

## Summary of Changes

- Vehicles: the pickup, the wagon and the high-roof van remodelled as hull tables traced by one loop (cold compile 31 s down to 9 s), PBR shading with a clear coat, self-shadow and the sun cast shadow; a dish on the van.
- Headlight flare (stimming-tgkh), close-pass shake (stimming-4o7q), rain water trail (stimming-dmw4).
- Trees: elms, poplars and cedars with low-poly facets lit by the sun and a sun rim; shelterbelts lit; uprooted near trees fly into the funnel and fade out, far ones fade in place.
- Fixed on the way: horizon streaks from the spray, cab bodies shaded as glass, far vehicles under the poles and fence.
- On main as 67c87fdd. Open: bushes and hedges, and the cloud floor bake (stimming-fg1a, high).
