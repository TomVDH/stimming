---
# stimming-2ll1
title: 'Fire: bare floor by default, three quality steps'
status: completed
type: task
priority: normal
created_at: 2026-11-03T21:18:57Z
updated_at: 2026-11-03T21:45:54Z
parent: stimming-cyhy
---

Tom: take the iron box off by default, hide every box option, and add three quality steps for performance.

- [x] Fire starts on bare floor; the Burner row leaves Settings
- [x] Settings gains Low, Medium and High
- [x] Each step lowers real GPU cost (pixels, march steps, shadow rate; the sim rate stays)
- [x] The slow-GPU watchdog moves the chip; a picked step stays
- [x] QA at 1280 and 375 with measured frame cost

## Summary of Changes

Fire burns on bare floor. The Burner row is gone and the box code stays, unreachable. Settings holds Quality: Low, Medium, High; High is the default.

Uncapped fps at 1280, this Mac, two rounds: old 65, High 74-80, Medium 125-139, Low 179-182.

The steps change pixels, volume ray steps and shadow redraw rate. A longer fluid step made the flame about 4x larger, and pressure, cooling, heat and emission changes did not restore it, so the fluid step stays fixed.

A slow GPU steps quality down and the chip follows; a picked step stays. PCFShadowMap replaces the removed PCFSoftShadowMap, which clears the console warning.
