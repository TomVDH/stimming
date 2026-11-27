---
# stimming-5f9k
title: 'Fresh / Classic switch: the intro''s flash box, on all toys'
status: completed
type: task
created_at: 2026-11-03T21:05:32Z
updated_at: 2026-11-03T21:05:32Z
---

Tom rejected the stamped slab switch as off brand and pointed at the intro's highlight.

- [x] The current build sits in a white flash box, in Gabarito, dark type knocked out
- [x] The box closes in on hover and parts down the middle, as the intro's box does
- [x] All seven toys with a Classic build use it
- [x] QA: both builds, 1280px and 375px, links work both ways

## Summary of Changes

`shared/stim.js` always builds the two-label switch. `shared/stim.css` styles it with `--ver-split`. The plain `.ver` pill stays only for TV tree's Channels link. `AGENTS.md` now names the switch.
