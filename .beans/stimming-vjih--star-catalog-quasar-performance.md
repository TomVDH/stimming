---
# stimming-vjih
title: 'Star catalog: quasar performance'
status: completed
type: task
priority: normal
created_at: 2026-11-25T08:05:34Z
updated_at: 2026-11-25T08:20:08Z
parent: stimming-e35i
---

Tom, 2026-11-25: "quasar performance abysmal -- what can we do here". Keep the look Tom signed off on stimming-npew.

- [x] Bake the band's and the clouds' Worley dust and self-shade once at load into 3D textures in their turning frames; the trace reads one texel per layer
- [x] Off means no compute: each quasar layer skips when its Dev knob is 0
- [x] Measure on 3C 273, full view, Edge pane: before 48.2 ms median, 56.2 p95 at 1223x1201; after 14.6 ms median, 19.5 p95 at 1616x1201
- [x] Tom checks the look matches (2026-11-25: "this works")
- [x] Black hole detail is on main; the quasar is a hole, so its smaller sky pass stacks on the bake
- [x] Push to main (146769bf)
