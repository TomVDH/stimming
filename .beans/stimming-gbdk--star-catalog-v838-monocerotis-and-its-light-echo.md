---
# stimming-gbdk
title: 'Star catalog: V838 Monocerotis and its light echo'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T19:48:17Z
updated_at: 2026-11-25T19:53:20Z
parent: stimming-e35i
---

Tom picked it on 2026-11-25 (the impressive one). A red supergiant after a merger; pulled back, the 2002 flash's light echo grows through warped dust shells (runaway kind 7).

- [x] v838Echo, entry and the id in every table
- [x] Full 48-step 3D volumetric raymarch with Beer-Lambert absorption and baked radial self-shadowing (NBAKE)
- [x] Docs
- [ ] Tom's live look

Baked (Tom, 2026-11-25): the dust is a 128³ volume baked once on first show (NBAKE); `v838Echo` marches it front to back in 48 steps with light-echo delay `r - z`, K3-style radial self-shadowing, and foreground dust occlusion.
