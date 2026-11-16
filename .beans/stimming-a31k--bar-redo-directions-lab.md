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
- [ ] Tom picks a direction

## Notes

- The lab loads the toy page as text into the frame's `srcdoc`. Its import map gets a scope that points `shared/stim.js` at `barlab/shim.js` for modules in the toy's folder only.
- The shim hides the shell's layer and acts through the shell's handles (`ui.choice`, `ui.slider`, `ui.action`, `ui.setting`). The `bar` spec does not change.
- Checked on Galaxy, Pendulum, Fire, Rain and Eyes: no control leaves the stage, no button under 34 px, clean console.
- Known weak point: Bare's icons are faint on a bright mid-tone scene (Rain).
