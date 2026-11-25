---
# stimming-7nqh
title: 'Shell: less padding between the screen edge and the toy stage'
status: completed
type: task
priority: normal
created_at: 2026-11-25T08:25:34Z
updated_at: 2026-11-25T08:29:51Z
---

Tom, 2026-11-25: reduce the padding between the viewport edge and the toy viewport. Shared change; Tom's words are the yes.

- [x] Body gutters in shared/stim.css: 16px to a smaller value, safe-area insets kept
- [ ] Tom sees it on Star Chart (mobile, tablet, desktop)
- [x] Spot-check Railgun and one Classic legacy.html
- [x] DESIGN.md gutter lines match
- [x] Commit and push

## Summary of Changes

Body side gutters in shared/stim.css go from 16px to 8px; safe-area insets stay. No toy overrides it, so all toys get it (Tom: all toys). DESIGN.md gutter token and page line match.
