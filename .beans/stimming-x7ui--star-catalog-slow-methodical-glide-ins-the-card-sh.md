---
# stimming-x7ui
title: 'Star catalog: slow, methodical glide-ins; the card shows the discovery year'
status: completed
type: task
created_at: 2026-11-25T00:48:44Z
updated_at: 2026-11-25T00:48:44Z
---

Tom, 2026-11-24: "the init zoom from quart to full star is SLOW and METHODICAL" and "in the intro cards -- I want the Discovered {year] there".

- [x] Opening and switch glides: 6.5 s on an even S-curve (smootherstep), outside the Zoom weight; a hand zoom takes over at the glide's speed
- [x] Measured: opening 6 to 2 in 6.5 s, card 1.9 s after it stops; switch 0 to 2 in 6.5 s, card 1.8 s after
- [x] FACTS gain found: a year (sourced), known since antiquity for naked-eye stars, none for the Sun and the Thorne-Zytkow model
- [x] Card row discovered, after catalogue
- [x] Doc lines

## Summary of Changes

main.js: glideIn() stores a timed glide; stepGlide() runs it; stepFollow() holds the followers. facts.js: found per object, the discovered row.
