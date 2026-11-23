---
# stimming-iv1u
title: 'Observatory: a new celestial selector and sky controls'
status: completed
type: task
created_at: 2026-11-23T09:45:28Z
updated_at: 2026-11-23T20:35:00Z
parent: stimming-wqq9
---

Tom, 2026-11-23: "Depends on selection in the overview screen -- let's redo the celestial selector -- we should also have controls for diff skies (diff seasons, diff ability to see specific skies)".

The selection in the wide shot decides which telescope answers: the great refractor in the new classic dome, or the 1 m reflector in the big dome. The slew, the laser and the cuts follow that dome. Sky controls set the season and how well the sky shows.

Related: stimming-hben (aim marker: thin white line, soft glow on the sky).

- [x] Read the standards, the plan and the code
- [x] Mock of the selector on a live frame
- [x] Tom picks the rule, the sky model and the controls
- [x] Short design, Tom's yes (docs/plans/observatory-selector.md); build plan docs/plans/observatory-selector-build.md
- [x] Selector in the wide shot
- [x] Switchable hero dome: obs-cuts made cuts.start take the dome; the selector passes the chosen dome (rebased on integration 357658dd)
- [x] Sky controls: Night, City light, Site
- [x] check:observatory and check:railgun: 0 errors; check:shared keeps main's 3 errors in shared/flare.js; 153 node tests pass
- [x] Screenshots to Tom; his sign-off: Tom signed off the look and approved the merge to main, 2026-11-23 (a7aa2fd1)
- [x] The classic dome from the building session replaces the stand-in: refractor in complex.main, 1 m in complex.big
