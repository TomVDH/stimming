---
# stimming-y3yn
title: 'Clock: the clock menu fits the viewport, no scroll'
status: completed
type: task
created_at: 2026-11-16T18:58:32Z
updated_at: 2026-11-16T18:58:32Z
---

Tom, 2026-11-16: "reduce size of stimming wordmark etc so that the clock menu always sits on viewport -- currently have to scroll -- let's get this smartly and elegantly resized".

- [x] Wordmark, tagline, gaps and the clock size to the viewport height in the Clock view
- [x] The whole clock and the Re-roll show without scroll at common desktop and phone sizes (1920 x 1080 to 1024 x 640, 375 x 812, 390 x 664, 812 x 375)
- [x] ?all and ?lab keep their sizes (every rule is scoped to the Clock view)

## Summary of Changes

- `shared/menu/clock.css`: in the Clock view the wordmark, tagline, gaps and clock scale with the window height; the clock takes the height that is left (200 to 660 px).
- `AGENTS.md` and `DESIGN.md` describe the rule.
