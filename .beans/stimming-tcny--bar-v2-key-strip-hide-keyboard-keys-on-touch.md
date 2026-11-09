---
# stimming-tcny
title: 'Bar v2 key strip: hide keyboard keys on touch'
status: completed
type: bug
priority: normal
created_at: 2026-11-09T08:00:14Z
updated_at: 2026-11-09T08:01:31Z
parent: stimming-tbpn
---

The key strip shows keyboard keys (SPACE) on coarse pointers. Spec section 1 says keys show on fine pointers only.

- [x] Hide keyboard-key entries in makeKeys on (pointer: coarse), live
- [x] Remove the Wind map local workaround
- [x] Check Wind map at 375 and 1280, Galaxy and one more Bar v2 toy
- [x] Commit and push

## Summary of Changes

- `makeKeys` hides an entry on coarse pointers when its word does not start with a pointer verb (click, tap, drag, hold, release, scroll, pinch, press, swipe, double-click).
- The check runs again on the media query change.
- Wind map drops its local filter.
- Checked: Wind map 375 px shows DRAG, TAP; desktop shows DRAG, CLICK, SPACE. Galaxy keeps HOLD + DRAG on touch. Bench renders. Console clean.
