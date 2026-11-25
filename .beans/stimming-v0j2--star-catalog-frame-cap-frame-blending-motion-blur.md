---
# stimming-v0j2
title: 'Star catalog: frame cap, frame blending, motion blur, camera sway'
status: in-progress
type: task
created_at: 2026-11-25T07:57:26Z
updated_at: 2026-11-25T07:57:26Z
parent: stimming-e35i
---

Tom, 2026-11-24 (via the coordinating session): performance must be smooth; Dev options 24, 30, 60 and unlimited; frame blending; motion blur; a gentle camera sway on the quarter cut, gentler on the half, none from the full star out.

- [x] Baseline frame cost (headless Edge, RTX 3070, draw plus readback): Sun 12 ms, Pōwehi 12 ms, WOH G64 14 ms, 3C 273 33 to 38 ms with long-lens spikes to 178 ms
- [x] Dev Frames: cap (Unlimited, 60, 30, 24) on an even grid; frame blending; motion blur from the camera's move (a post pass only while on)
- [x] Camera sway: long lens, half on the wide view, none from the full star; off under reduced motion; stops asleep
- [ ] Tom's look
- [ ] The quasar's cost (owned by the starcatalog sessions)
