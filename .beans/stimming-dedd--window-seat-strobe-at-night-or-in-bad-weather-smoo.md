---
# stimming-dedd
title: 'Window seat: strobe at night or in bad weather, smooth near fog, tip lamp at the leading edge'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T09:46:11Z
updated_at: 2026-11-15T09:46:20Z
parent: stimming-w1nd
---

Tom, 2026-11-15.

- [x] The strobe flashes only at night or in bad weather (storm, rain, fog bank): strobeOn()
- [x] The near fog's march jitter moves each frame, so the resolve averages it; a fixed jitter showed as grain in bright fog
- [x] The nav light and strobe sit in the leading edge at the winglet's root, not on its top; the strike tap target is the sail's middle (SAIL)
- [ ] Cloud deck accuracy: waiting for Tom to say what looks wrong

## Summary of Changes

window/index.html: strobeOn, the uJit replace for the near fog, TIP and SAIL. window/wing3.js: the tip lights' skin positions. Checked at Noon in fog 0.45: console clean, lamp at the corner, fog smoother with a faint mottle left.
