---
# stimming-0bzi
title: 'Kaleidoscope: bar to the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:35:00Z
updated_at: 2026-11-03T20:40:51Z
parent: stimming-5a8x
---

Bring the Kaleidoscope bar onto the Control bar standard (AGENTS.md, a8a95fd).

- [x] 6 | 12 stays as the one choice group
- [x] Tri moves into Settings (sliders icon, before the (i))
- [x] Shuffle shows the die icon plus the word
- [x] QA at 1280 and 375 px, clean console
- [x] Commit through a private index and push

## Summary of Changes

- The bar is 6 | 12, Shuffle (die plus word), then Settings and the (i) at the right edge.
- Settings holds one row, Mirrors: Two | Tri. It opens on hover or tap; a pick, a tap elsewhere or Escape closes it.
- Under Tri the sector chips keep their count, go dim and ignore taps.
- Phones (400 px and under) close the bar's group gap to 18 px so it keeps one row. This is a toy-local override of the shell bar.
