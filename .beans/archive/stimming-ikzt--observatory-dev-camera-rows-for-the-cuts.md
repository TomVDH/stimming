---
# stimming-ikzt
title: 'Observatory: Dev camera rows for the cuts'
status: completed
type: task
priority: normal
created_at: 2026-11-18T02:22:53Z
updated_at: 2026-11-18T03:13:28Z
parent: stimming-wqq9
---

Tom, 2026-11-17: a tool to change the cuts' camera quickly. Under ?dev: eye x/y/z, look x/y/z, fov and blur for the shot that shows; the camera re-locks on a change; a Copy row gives the PLANS line. Works with the dev pause (stimming-vz29).

- [x] Dev rows in setup.ts
- [x] Live edit of PLANS and CUTS; re-lock and redraw while paused
- [x] Copy row
- [x] Live check

Also: input.ts takes a stage press as a tap only on the canvas, so a press on the bar or a sheet never skips the cuts.

## Summary of Changes
setup.ts Cut camera Dev rows and Shot row; cuts.ts camDev (get, set, line); loop.ts wiring; input.ts takes a tap only on the canvas.
