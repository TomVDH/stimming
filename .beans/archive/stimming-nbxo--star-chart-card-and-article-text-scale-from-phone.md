---
# stimming-nbxo
title: 'Star Chart: card and article text scale from phone to large desktop'
status: completed
type: task
priority: normal
created_at: 2026-11-25T08:25:22Z
updated_at: 2026-11-25T08:30:52Z
parent: stimming-e35i
---

Fluid type (clamp) for the star card and the info article, a readable measure, line-height and spacing that scale, no overflow or clipping at narrow widths or short heights.

- [x] Card: fluid type and measure
- [x] Article: fluid type, measure and height
- [x] Check 375, 768, 1280, 1920 and a short height in the pane
- [x] Commit and push

## Summary of Changes

- Card and article share one fluid base size, clamp(12px, 0.5rem + 0.36vw + 0.2vh, 17px); every line is an em step of it. 1280 stays as it was.
- The name grows on its own curve (24 to 60 px on the card, 24 to 52 px on the article), capped by the screen height.
- Phone article stands above the time clock and the wrapped bar.
- Short screens (480 px tall or less): the card stands on the bar, clear of the monogram, rows closer, no Sun diagram; the article runs from the top to the time clock and its body scrolls.
- Checked in the pane at 375 x 812, 768 x 1024, 1280 x 800, 1920 x 1080 and 812 x 375.
