---
# stimming-zggq
title: 'Shell: Bar v2 press cue without hard shadows'
status: completed
type: feature
priority: normal
created_at: 2026-11-17T05:22:22Z
updated_at: 2026-11-17T15:52:06Z
parent: stimming-51dy
---

Interview 46, 49: no hard shadows anywhere. Gallery of three press/on cues for Bar v2 controls; Tom picks; then shell change. Visible: Tom's look.

## Gallery

`docs/qa/bar-press/spike-press.html` (local server only): Now (hard shadow) against A flat flash, B edge bar, C offset ring, on a bright and a dark still, with a state strip per option (rest, hover, press, on, on + hover). Tom picked C, offset ring.

- [x] Gallery of three cues
- [x] Tom picks (C, offset ring)
- [x] Shell change in shared/stim.css (worktree + PR)
- [x] Tom's look on the PR; merged as PR 69
- [x] Prism and Canal at dusk: moved to stimming-g5ul and stimming-dm61

## Summary of Changes

- shared/stim.css: a 1 px ring 4 px outside each Bar v2 control. Hover 0.6, press snaps to the edge, pick or open holds it at 1.
- Sheets and choice groups with a pick get an outline 3 px out.
- No box shadow or hover lift is left in the shell. --shadow, --hard and --lift stay for toys that still read them.
- DESIGN.md and docs/plans/bar-v2.md match. Merged as PR 69 (8cb23250).
