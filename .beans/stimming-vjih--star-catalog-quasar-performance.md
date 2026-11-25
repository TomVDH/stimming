---
# stimming-vjih
title: 'Star catalog: quasar performance'
status: in-progress
type: task
created_at: 2026-11-25T08:05:34Z
updated_at: 2026-11-25T08:05:34Z
parent: stimming-e35i
---

Tom, 2026-11-25: "quasar performance abysmal -- what can we do here". Keep the look Tom signed off on stimming-npew.

- [x] Bake the band's and the clouds' Worley dust and self-shade once at load into 3D textures in their turning frames; the trace reads one texel per layer
- [x] Off means no compute: each quasar layer skips when its Dev knob is 0
- [ ] Measure median and p95 frame ms on 3C 273, before and after
- [ ] Tom checks the look matches
- [ ] Stack on Black hole detail (starcatalog's setting) once it is on main
- [ ] Push to main
