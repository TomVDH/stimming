---
# stimming-woll
title: 'Menu: maximize Clock dial space and vertically center it in viewport'
status: in-progress
type: task
priority: normal
created_at: 2026-11-25T23:18:35Z
updated_at: 2026-11-25T23:21:42Z
---

Tom asked (2026-11-25) for the Clock menu circle to use a larger proportional chunk of the viewport, maximize space smartly, and sit vertically centered in the viewport.

Checklist:
- [x] Update shared/menu/clock.css sizing variables and wrap grid rows (auto auto 1fr auto) to vertically center the dial and remove double-counted gap deductions
- [x] Update docs/menu.md Fit rules to match shipped CSS
- [ ] Get Tom's look at 1280px, 1440px, 812x375, and 375x812 before committing via tools/commit.sh
