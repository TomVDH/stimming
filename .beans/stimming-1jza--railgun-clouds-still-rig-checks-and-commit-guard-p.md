---
# stimming-1jza
title: 'Railgun clouds: still rig, checks and commit guard (plan step 1)'
status: in-progress
type: task
priority: normal
created_at: 2026-11-16T22:59:31Z
updated_at: 2026-11-16T23:23:22Z
parent: stimming-626s
---

Step 1 of the approved cloud plan (docs/plans/railgun-clouds-review.md, section 8; Tom, 2026-11-16 15:58: "Approve the plan").

- [x] __qa.still() in railgun/index.html: freeze, fixed clocks, no random events, pinned rung, rock at fall 0.45
- [x] tools/clouds-check.mjs: bounds probe, steps probe, visibility, colour, golden diff, frame time
- [x] Golden before set in docs/qa/railgun-clouds/golden/
- [x] tools/commit.sh refuses a commit that drops lines another bean added recently
- [x] Exit: the lobes test fails the bounds probe; the towering cumulus fails visibility
- [ ] Tell the sky owner and lift the freeze
