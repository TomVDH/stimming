---
# stimming-vwso
title: 'Star catalog: red supergiants heave and churn; Dev Haze denoise row'
status: completed
type: task
created_at: 2026-11-25T00:52:49Z
updated_at: 2026-11-25T00:52:49Z
---

Tom, 2026-11-24: "can red super giants have undulations in their surface -- as real red giants look like a bubbling lump", then "run autonomously"; and "the denoiser option add to dev menu".

- [x] lump per star: limb heave, lobe scale, churn pace, cell light (Betelgeuse 6%, VY CMa 8%, Arcturus 1.5%)
- [x] The sky pass warps the plane along each ray from the centre, so the disk and its glow move as one; hot cells bulge and brighten
- [x] Churn follows the turn clock: about 40 s per lobe at x10k
- [x] Dev Volume: Haze denoise (history weight 0.85 at 1, off at 0, 0.935 at 1.1)
- [x] Doc lines

## Summary of Changes

sun.js lump settings; main.js churn phase and f.lump, the fxDenoise row; render.js uLump, lumpAt, the warp and the cell light. Committed as hunks: the objects chat has uncommitted hole work in the same files.
