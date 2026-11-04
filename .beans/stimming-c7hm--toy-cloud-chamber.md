---
# stimming-c7hm
title: 'Toy: Cloud chamber'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T18:00:00Z
updated_at: 2026-11-04T18:00:00Z
---

Build Cloud chamber from docs/toy-dev-plan.md, section 3. It starts in the Lab. It follows the Look rule: velvet, mist and one raking light, no props.

Tom picked option (a): alphas stay straight in the magnet, as in physics. Mantle also emits some betas (thorium chain), so the magnet shows on those.

- [x] Plate: K1 two channels (fast flash R, slow trail G) plus advected mist (B)
- [x] Mist pass: curl-noise flow, light diffusion, drag pushes, decay
- [x] Tracks: alpha (Bragg end, rare kink, thoron pairs), beta (scatter, spiral), muon, cosmic electron, delta rays
- [x] Composite: raking lamp with shafts, velvet floor, halo, grain
- [x] Bar: Cosmic, Mantle, Beta; Magnet; Shower; Settings (activity, mist, light, track life)
- [x] Tap places the source (Cosmic: a tap sends one muon); drag stirs; Space showers
- [ ] Checkpoint 1: Tom reviews Mantle at half magnet
- [ ] Sound: soft tick per track, hiss bed, shower clatter
- [x] toys.json entry (Dutch name and IPA are drafts)
- [ ] Menu Lab entry with an icon and a GSAP hook
- [ ] QA: 1280 and 375 px, clean console, reduced motion, hidden tab stops the loop
- [ ] Record the session cost
