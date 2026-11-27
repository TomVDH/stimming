---
# stimming-nwv4
title: 'Oscilloscope: icon redo with knot-tour hover'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:21:46Z
updated_at: 2026-11-03T20:24:58Z
parent: stimming-a3bd
---

Tom wants a slight redo of the menu icon (picks.json: Current, redo slight).

- Fewer screen elements: the frame or the display, no bars or brackets.
- Hover tours all 19 coprime knots of the toy's picker, then settles on 3:2.

## Checklist
- [x] Draft variants (A frame, B display, C display with persistence)
- [x] Tom picks a variant (B, Display)
- [x] Apply the pick to the menu icon and its play/rest
- [x] Update the emblem shared/emblems/scope.svg to match
- [x] QA at 1280px and 375px, clean console
- [x] Commit and push

## Summary of Changes

- The menu icon is the display alone: a dark glass tile with a rim, a glowing 3:2 knot and a beam head. The case, centre bars, brackets and cut stroke are gone.
- The rest phase is pi/2, so the 3:2 knot reads clean.
- Hover tours the 19 coprime knots of the picker: each holds, then morphs into the next; the phase rolls three turns per tour. Leave blends back to 3:2 in 0.45 s.
- The emblem is a white rim, the 3:2 knot and the head.
