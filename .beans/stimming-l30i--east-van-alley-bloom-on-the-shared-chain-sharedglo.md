---
# stimming-l30i
title: 'East Van Alley: bloom on the shared chain (shared/glow.js)'
status: completed
type: task
created_at: 2026-11-22T19:40:44Z
updated_at: 2026-11-22T19:40:44Z
parent: stimming-guw5
---

Tom (2026-11-22): yes, swap it (after PR #96 merged). Part of the consolidation in stimming-ssrh.

- [x] Drop the private bloom chain (two shaders, six targets, a pass function)
- [x] bloomChain from shared/glow.js; levels from glowDetail(D.level); a tiny threshold turns on its cap of 64
- [x] The output divides by the level count it ran
- [x] Same frame: at most 3/255 by day, 1/255 at dusk and night; console clean

## Summary of Changes

East Van Alley's bloom runs on shared/glow.js bloomChain: 71 lines out, 15 in. The look holds. Note for stimming-ssrh: East Van Alley is a bloomChain adopter.
