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
- [x] Tom's verdict on the Signal bar (2026-11-16): "i like signal a lot -- needs some iterations". Signal is the base
- [x] Branches: another session built Standard (three rounds) on `claude/bold-davinci-7fc18a` and cut the first four directions there. Signal continues on `claude/bold-davinci-7fc18a-signal`; neither branch overwrites the other
- [x] Signal round 2 (Tom, 2026-11-16, by dialog: iterate type and weight, the sheets, the motion beats and the toy's ink; keep the soft glass)
  - Type: Iosevka Term Slab ExtraBold 14 px, 18 px icons, 44 px controls, a heavier slider
  - Ink: white is the flash (a thing that happens now); the toy's accent is a state that holds (icons, the slider fill, a held pick)
  - Beats: a pick cuts in oversize for one frame, holds two, then parts; a picked row holds one frame in ink before its list leaves
  - Sheets: no boxes or hairlines; a sheet lands as a flash box from its own button and parts over its rows; it leaves in two frames
- [x] Tom, 2026-11-16: "we'll keep bare too". The lab shows Signal, Bare and Today; Dock, Tuck and Askew are cut from the lab and its code
- [ ] Not checked on round 2: 812 x 375, a real touch screen, keyboard-only use; Railgun loads in the lab but two of its files failed once on the local server
- [ ] Not ported from the other session's Standard: the Dev sheet (`?dev`)
- [ ] Tom judges Signal round 2

## Notes

- The lab loads the toy page as text into the frame's `srcdoc`. Its import map gets a scope that points `shared/stim.js` at `barlab/shim.js` for modules in the toy's folder only.
- The shim hides the shell's layer and acts through the shell's handles (`ui.choice`, `ui.slider`, `ui.action`, `ui.setting`). The `bar` spec does not change.
- Checked on Galaxy, Pendulum, Fire, Rain and Eyes: no control leaves the stage, no button under 34 px, clean console.
- Known weak point: Bare's icons are faint on a bright mid-tone scene (Rain).
- Signal's motion plan (choreograph skill): the bar is one object with one entrance. First arrival: the flash fills for 2 frames, snaps to size, holds, then parts in 3 frames; the key strip joins as the box parts. Return: 5 frames. Leave: 3 frames. A sheet lands in 2 frames with its glass; its rows do not stagger. Every sequence stops when a newer one starts. Reduced motion shows and hides at once.
- The flash box uses difference blending inside one isolated group, so the words under it turn dark frame by frame with no second copy.
