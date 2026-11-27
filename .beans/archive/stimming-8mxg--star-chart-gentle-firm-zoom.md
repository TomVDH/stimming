---
# stimming-8mxg
title: 'Star Chart: gentle, firm zoom'
status: completed
type: task
created_at: 2026-11-25T17:23:59Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-oh7b
---

Tom, 2026-11-25: the zoom control overshoots often; make it a bit more gentle and robust.

- [x] Measure: a light trackpad fling ran the target from the full star to x32 (lead 4 units), and the view drifted 3 to 5 s after the hand stopped
- [x] A hand gesture leads the view by one stop at most (LEAD 1)
- [x] Firm followers: each caps its speed so it never passes its target; a reversal drops the hidden follower's speed
- [x] Wheel line and page modes count as pixels
- [x] Frame simulation, old against new: fling travel 1 stop, interrupted glide no dip (was 0.24 past)
- [ ] Tom feels it in the toy
