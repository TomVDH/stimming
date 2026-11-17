---
# stimming-a31k
title: 'Bar redo: directions lab'
status: in-progress
type: spike
created_at: 2026-11-16T09:53:39Z
updated_at: 2026-11-16T09:53:39Z
---

Tom, 2026-11-16: "we are completely redoing the style and ux of the bars". He gave no brief and said: just dive in.

Question: which direction does the bar redo take?

`barlab/` (noindex) shows directions on a real toy. A stand-in for `shared/stim.js` takes the toy's own `bar` spec and builds each direction from it. No shell file changes.

## Checklist

- [x] `barlab/index.html`: concept switch, toy picker, size switch
- [x] `barlab/shim.js`: wraps `initPage`, builds a direction from the spec and the handles
- [x] Four directions: Dock, Bare, Tuck, Askew; Today for comparison
- [x] Requirements from the drift rows: a keyboard focus mark (a bar under the control), 44 px touch targets, 12 px text at full ink
- [ ] Not checked: 812 x 375, a real touch screen, keyboard-only use from end to end
- [x] Check 1280 px and 375 x 812; clean console
- [x] Tom's ingredients (2026-11-16, by dialog): keep One bar (Dock) and No boxes (Bare); build from the intro's flash beats; controls leave while you touch the stage, then return
- [x] One idea from those ingredients: the Signal bar, in `barlab/` (the lab's default view; Replay and `?slow=N` show its beats)
- [x] Signal checked on Galaxy, Pendulum, Fire, Eyes and Rain at 1280 px and 375 x 812: no control leaves the stage, clean console; arrival, leave and return filmed frame by frame
- [ ] Not checked on Signal: 812 x 375, a real touch screen, keyboard-only use, the frame cost of the glass on a slow machine
- [ ] Tom's verdict on the Signal bar

## Notes

- The lab loads the toy page as text into the frame's `srcdoc`. Its import map gets a scope that points `shared/stim.js` at `barlab/shim.js` for modules in the toy's folder only.
- The shim hides the shell's layer and acts through the shell's handles (`ui.choice`, `ui.slider`, `ui.action`, `ui.setting`). The `bar` spec does not change.
- Checked on Galaxy, Pendulum, Fire, Rain and Eyes: no control leaves the stage, no button under 34 px, clean console.
- Known weak point: Bare's icons are faint on a bright mid-tone scene (Rain).
- Signal's motion plan (choreograph skill): the bar is one object with one entrance. First arrival: the flash fills for 2 frames, snaps to size, holds, then parts in 3 frames; the key strip joins as the box parts. Return: 5 frames. Leave: 3 frames. A sheet lands in 2 frames with its glass; its rows do not stagger. Every sequence stops when a newer one starts. Reduced motion shows and hides at once.
- The flash box uses difference blending inside one isolated group, so the words under it turn dark frame by frame with no second copy.
