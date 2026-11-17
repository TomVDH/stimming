---
# stimming-hdtz
title: 'Tornado alley: model the pickups, chasers and trees'
status: in-progress
type: task
priority: normal
created_at: 2026-11-17T16:13:07Z
updated_at: 2026-11-17T18:45:14Z
parent: stimming-dwwg
---

Tom, 2026-11-17: "model the pick up trucks and the trees". The vehicles and trees read as real objects, not blockouts.

- [x] Baseline frame cost: three F4.5 (headless A/B against main on port 8000; the GPU is shared, so only same-run pairs compare)
- [x] Pickup: cab, bed, wheel arches, roof, bumpers, mirrors; lit by sun, sky and haze (waits for Tom; three F4.5 flat, +5 ms only while the pickup fills the frame)
- [x] Chasers: real silhouettes, roof rack and light bar (wagon and high-roof van; hulls and parts as data tables, cold compile 9 s against main's 12 s)
- [x] PBR shading on all three, and a dish on the van (Tom, 2026-11-17: "lets PBR them and put a dish on the van")
- [x] Tom approves the vehicles (2026-11-17: "Yes, do the flare")
- [ ] Near trees (infra, plain lone trees): crowns with volume, trunk, branch gaps, self-shadow, sway
- [ ] Farm windbreak trees
- [ ] Far trees and shelterbelts
- [ ] Destruction still works at each band
- [ ] Tom approves the trees
- [ ] Frame cost flat, console clean
- [ ] Commit through tools/commit.sh with this bean

## Found on the way (pre-existing, fixed in the pickup pass)

- vSpray called hazed() with the plume's direction even at zero alpha; hazed() sets up the pixel's air once, so black streaks showed at the horizon round any vehicle under 3 m/s.
- vPart returned the cab hull's id 2 for painted panels, so cab bodies shaded as dark glass (the van read black). Fixed for the pickup; the chasers get it in their pass.
- Vehicles past 60 m drew before the line and the fence, so poles and posts beyond them painted over them. Far vehicles now draw after plain().
