---
# stimming-2z6t
title: 'Observatory sim: every part of the 1 m''s screen responds'
status: todo
type: task
created_at: 2026-11-23T23:34:21Z
updated_at: 2026-11-23T23:34:21Z
parent: stimming-wqq9
blocking:
    - stimming-27uv
---

Tom, 2026-11-23: colour filters and other parts feel dead. The filter clicks work, but the grey image does not change, so a filter looks like it does nothing. The picture shows what each filter passes (R, G and B in their colours, Hα glowing gas, a colour build from R, G and B). Readouts teach on a click. The focuser moves by hand.

## Checklist

- [x] Each filter tints the picture in its colour; L stays grey; Hα is dim deep red (rig.ts TINTS, camera.frag.glsl u_tint)
- [x] A click on any readout opens its tip at once, even with tips off
- [x] The focuser moves by hand: < and > beside POS, or the [ and ] keys
- [ ] A colour picture built from R, G and B
- [ ] Hα shows glowing gas, once nebulae exist (stimming-6u1r)
- [ ] Tom tries it
