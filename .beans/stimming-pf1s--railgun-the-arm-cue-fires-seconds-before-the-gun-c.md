---
# stimming-pf1s
title: 'Railgun: the arm cue fires seconds before the gun can hit'
status: todo
type: bug
created_at: 2026-11-15T06:02:30Z
updated_at: 2026-11-15T06:02:30Z
parent: stimming-f793
---

QA, 2026-11-14. The arm cue (clunk and rail sparks) plays at charge 0.6, 2.4 s into the charge. A release only fires when the gun is laid: aimNow.err < 0.012 rad (act.release).

At rest the gun parks 8 degrees up the causeway. A hold traverses it to the rock at 3.2 degrees a second. The rock sits about 13 degrees off, so the gun is on target only near charge 0.84, about 6.5 s into the charge. Ranging adds 1.75 s before that.

Evidence (real mouse, headless): a 4.5 s hold fizzles at charge 0.65 with err 0.11 rad. A 10 s hold fires. The charging still shows the barrel well below the rock.

A player who releases after the arm cue gets a fizzle and no reason.

## Checklist

- [ ] Tom picks one: cue the arm when the gun is armed and laid, start the traverse at ranging, or slew faster
- [ ] Check a real 4 s hold fires, or gives a clear not-laid cue
