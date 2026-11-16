---
# stimming-a31k
title: 'Bar redo: directions lab'
status: in-progress
type: spike
priority: normal
created_at: 2026-11-16T09:53:39Z
updated_at: 2026-11-16T18:47:04Z
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
- [x] Standard (2026-11-16): Tom rejected Dock, Bare, Tuck and Askew as "sloppy" and gave the brief: logo and name top left; Settings, Info, Dev top right; toy controls in bottom bars; one reusable part set, one style, no gradients
- [x] Standard: one part set (bar, button, icon button, segmented with a gliding thumb, picker, slider, sheet, key hints), drawn SVG icons, measured fold into one bar; Railgun added to the toy picker; ?dev shows Dev
- [x] Standard checked at 1280, 375 x 812 and 812 x 375 on Galaxy, Pendulum, Rain and Railgun; clean console; detector shows advisories only (new bar colours and radii)
- [x] Standard round 2 (2026-11-16, Tom: none were graceful): rebuilt from the emil-design-eng, apple-design and microinteractions skills. Dark glass with a lit top edge and nested radii; the pick fill glides on a spring (response 0.34 s, damping 0.78) and stretches with speed; keyboard picks jump; press scales to 0.97; held actions fill left to right; sheets grow from their button, exit faster; tooltips with a warm hand-off; sound icon crossfades; bars rise in by movement only, so a stalled frame still shows them
- [x] Cut Dock, Bare, Tuck and Askew from the lab and its code (Tom, 2026-11-16: a full redesign, not a menu). The lab shows Standard and Today only
- [x] Round 3 (Tom, 2026-11-16: "go with the awwards", forget the Apple design), from build-awwwards-quality-sites and awwwards-animations. Direction: the bar is a strip of the toy's intro. Solid ink slabs, no glass or blur. Each control takes a wordmark hue for its hover bar, icon and held fill. Labels roll letter by letter. A pick cuts in as the flash box (oversize, then at size, 30 fps steps). Icons and actions lean to the mouse (GSAP quickTo, elastic return). Sheets wipe open in steps from their button's edge; rows step in. Checked: Rain, Galaxy, Pendulum at three sizes; magnet 5.8 px, flash 133 ms, labels keep their names; clean console
- [ ] Tom judges round 3

## Notes

- The lab loads the toy page as text into the frame's `srcdoc`. Its import map gets a scope that points `shared/stim.js` at `barlab/shim.js` for modules in the toy's folder only.
- The shim hides the shell's layer and acts through the shell's handles (`ui.choice`, `ui.slider`, `ui.action`, `ui.setting`). The `bar` spec does not change.
- Checked on Galaxy, Pendulum, Fire, Rain and Eyes: no control leaves the stage, no button under 34 px, clean console.
- Known weak point: Bare's icons are faint on a bright mid-tone scene (Rain).
