---
# stimming-c7hm
title: 'Toy: Cloud chamber'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-04T18:00:00Z
updated_at: 2026-11-04T19:00:00Z
---

Build Cloud chamber from docs/toy-dev-plan.md, section 3. It starts in the Lab. It follows the Look rule: velvet, mist and one raking light, no props.

Tom picked option (a): alphas stay straight in the magnet, as in physics. Mantle also emits some betas (thorium chain), so the magnet shows on those.

- [x] Plate: K1 two channels (fast flash R, slow trail G) plus advected mist (B)
- [x] Mist pass: curl-noise flow, light diffusion, drag pushes, decay
- [x] Tracks: alpha (Bragg end, rare kink, thoron pairs), beta (scatter, spiral), muon, cosmic electron, delta rays
- [x] Composite: raking lamp with shafts, velvet floor, halo, grain
- [x] Bar: Cosmic, Mantle, Beta; Magnet; Shower; Settings (activity, mist, light, track life)
- [x] Tap places the source (Cosmic: a tap sends one muon); drag stirs; Space showers
- [x] Checkpoint 1: Tom reviewed Mantle at half magnet and said go
- [x] Sound: soft tick per track (voice per kind, panned), hiss bed, shower clatter with a low thump
- [x] toys.json entry (Dutch name and IPA are drafts)
- [x] Menu Lab entry: brut block icon (alpha burst plus a beta curl) and a GSAP hook
- [x] QA: 1280 and 375 px, clean console (toy and menu hover), reduced motion, hidden tab stops the loop
- [ ] Tom checks fps on a real device (headless SwiftShader floor: 3.5 fps at 1280, 15 at 375)
- [ ] Record the session cost

Fix: walks that start off screen (muons, cosmic electrons, the shower) no longer end before they enter the view.

## Bar v2 (2026-11-09)

| v1 control | v2 slot | Why |
|---|---|---|
| Source: Cosmic, Mantle, Beta | Top left choice, segments, keys 1 to 3 | The one choice group |
| Magnet slider | Bottom right slider | The main knob; it moves to Settings on phones |
| Shower | Bottom left action, key Space | The one verb |
| Activity, Mist, Light, Tracks | Settings rows, persisted | Tweaks; the old storage keys carry over |
| (none) | Settings: Quality | Site row; a new quality refits the canvas |
| `dl.how` | Key strip: click place the source, drag stir the mist | |

- [x] Port to Bar v2; local popover CSS and JS deleted
- [x] Diegetic: none fits (the lamp and the magnet sit outside the frame)

