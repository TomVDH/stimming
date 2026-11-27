---
# stimming-v9im
title: 'Window seat: merge the flying branch into main, main''s wing work kept'
status: completed
type: task
created_at: 2026-11-15T10:22:33Z
updated_at: 2026-11-15T10:22:33Z
parent: stimming-w1nd
---

Tom, 2026-11-15: bring claude/window-seat-b9fbbb in gracefully and keep this chat's upgrades.

- [x] Kept from the branch: arrow-key flight with pitch and live altitude, the stand-in pass, the rocket sight, the horizon-hue paint map
- [x] Kept from main: the procedural skin (skin.js dropped), the A350 winglet, the bounce and fog lights, lampK, strobeOn, the fog uniforms, the flex damping, the bending shadow pass
- [x] The shadow redraw and the shadow target follow pitch as well as bank
- [x] Classic (legacy.html) sets uAtt and uAlt; the branch's shader change had left it black

## Summary of Changes

Merged in a separate worktree. Conflicts in window/index.html and window/wing3.js resolved with main as the baseline. Checked in the browser: the page flies, the full pass loads after the stand-in, console clean; Classic renders.
