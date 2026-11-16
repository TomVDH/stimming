---
# stimming-1jza
title: 'Railgun clouds: still rig, checks and commit guard (plan step 1)'
status: completed
type: task
priority: normal
created_at: 2026-11-16T22:59:31Z
updated_at: 2026-11-16T23:24:29Z
parent: stimming-626s
---

Step 1 of the approved cloud plan (docs/plans/railgun-clouds-review.md, section 8; Tom, 2026-11-16 15:58: "Approve the plan").

- [x] __qa.still() in railgun/index.html: freeze, fixed clocks, no random events, pinned rung, rock at fall 0.45
- [x] tools/clouds-check.mjs: bounds probe, steps probe, visibility, colour, golden diff, frame time
- [x] Golden before set in docs/qa/railgun-clouds/golden/
- [x] tools/commit.sh refuses a commit that drops lines another bean added recently
- [x] Exit: the lobes test fails the bounds probe; the towering cumulus fails visibility
- [x] Tell the sky owner and lift the freeze (the gate replaces it)

## Summary of Changes

On main as 1e55fee9. __qa.still() and __qa.stormSolo() in railgun/index.html; tools/clouds-check.mjs (bounds flags, steps, visibility, colour, golden, frame time as a note); the golden before set and README in docs/qa/railgun-clouds/; tools/commit-guard.sh sourced by tools/commit.sh (stale-copy drop guard, cloud gate). Exit tests met: the lobed anvil fails bounds at three suns; the towering cumulus fails visibility (about 670 px). The guard catches e9fc9c83 and bb4e4154 on history. Next: plan step 2 waits on Tom's scale decision.
