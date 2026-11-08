---
# stimming-i9t4
title: 'ShadyOS: the haunt beats'
status: in-progress
type: task
priority: normal
created_at: 2026-11-04T21:50:00Z
updated_at: 2026-11-08T10:21:34Z
parent: stimming-shdy
---

Four quiet beats make the OS feel possessed. No jump scares. See docs/plans/shadyos.md, Polish 1.

- [x] You looked away: on return from a hidden tab, the windows sit tidied, and a dialog says "You looked away. So I tidied up." The move happens once on return, so a hidden page does no work.
- [x] 3:33: the strip clock shows real local time; once per visit it reads 3:33 for one minute. The uptime counter ticks live.
- [x] Cursor: the OS draws its own pointer over the stage, with the kid's glitter trail. Once per visit it hesitates for a beat during a drag, then catches up. Touch has no pointer.
- [x] Screensaver: at about 45 s idle the OS starts its own saver while you watch (windows drift and line up). At 60 s the backlight dims to standby and the loop stops. Input wakes it with a small flicker.
- [x] File creep: each Error adds one more "untitled 44, 45..." file, saved at 3:33.
- [ ] Haunt obeys the Settings toggle (see the Settings bean).
- [ ] QA: idle and hidden checks still pass; reduced motion keeps the beats but drops the motion.

## Notes

- Haunt reads `stimming.shadyos.haunt` (`off` turns it off). The toggle UI lands with stimming-yb20.
- Haunt off keeps the pointer, the glitter, file creep and the standby dim.
- The untitled count persists in `stimming.shadyos.untitled`.
- Looked away needs 12 s away and a desk that was touched.
- Checked in the browser pane: clock, 3:33, tidy, saver, standby, wake, drag, 375 px. Reduced motion and the pause are not yet checked by hand.
