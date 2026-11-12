---
# stimming-cido
title: 'Railgun: Sight is Monolith over the NVG tube'
status: completed
type: task
created_at: 2026-11-12T09:12:33Z
updated_at: 2026-11-12T09:12:33Z
parent: stimming-f793
---

Tom (2026-11-12): wire the Monolith mockup (stimming-323x) into the toy's Sight.

- [x] Sight runs the composed frame through nvg/tube.js (white phosphor, no lateral colour, no honeycomb)
- [x] Monolith marks and words drawn live into a key; the key pass burns them in as negatives
- [x] Retire the period-glass rangefinder overlay (grade block, sightMark, makeScale)
- [x] QA: stills at 1280 x 800, 375 x 812, 812 x 375, dusk and night; clean console; frame time

## Summary of Changes

- `SightPass` is the composer's last pass while Sight is on. It feeds the finished frame to `nvg/tube.js` as its camera signal (`uCam`, `tCam`), white phosphor, the NVG toy's defaults. Photon count follows the time of day (`uCamExpo` 45 at night to 90 at dusk).
- The sight's own tube materials drop the lateral colour split and the fibre honeycomb (Tom: no chromatic aberration, no hex). `nvg/tube.js` is unchanged.
- The tube's last pass draws into a target; a key pass then burns in the Monolith marks and words. `sightKey()` draws them each frame into a canvas from the toy's geometry: green band (blurred), red core (far extreme of the local light).
- Marks: hairline horizon open round the bore; a split monolith that fills with `uCharge`; obelisks either side of the rock; beads to the intercept ring (rock velocity times the time of flight); beads up the bolt in flight; a broken ring where it struck. Words: range and closing speed, lay error in mrad, one word or count under the monolith. Gabarito, from the page's own font.
- The period-glass rangefinder is gone: its grade-shader block, `uSight*`, `tScale`, `sightMark` and `makeScale`. The 22 degree camera down the bore stays.
- QA (headless Edge, GPU): 1280 x 800, 375 x 812, 812 x 375; dusk and night; hold, charging, full, fired, struck. 30 draws a second with Sight on and off. Console: the tube shader's two ANGLE X4000 warnings (the NVG toy logs the same), and the local server's favicon 404.
- Stills: `lab/railgun-sight/sheets/toy-desk.jpg`, `toy-phone.jpg`, `toy-land.jpg` (dusk on top, night below).
