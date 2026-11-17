---
# stimming-1rv3
title: 'Menu: the Clock is the default view; ?all shows the full shelf'
status: completed
type: feature
created_at: 2026-11-16T07:40:31Z
updated_at: 2026-11-16T07:40:31Z
---

Tom, 2026-11-16: the Clock from the menu probe (stimming-aiir) becomes the default menu.

- [x] Default view is the Clock: twelve main-shelf toys on a dial, with a Re-roll
- [x] ?all shows the full shelf (the old default); the Lab link shows only there
- [x] Re-roll leaves the middle: it appears after 5 s, at the foot of the circle
- [x] The Dial's outline (ring and minute marks) draws in as the clock pops in, then fades
- [x] A faint glow follows the pointer round the ring while a toy is in hand
- [x] The circle shows the name and motto of the toy in hand on a dark plate
- [x] The still moved out of the circle (Tom, mid-build): it is a faint full-page background, shaded as a 1950s picture tube, in colour ("no mono in the clock other than the copy")
- [x] Tom, after a look: the still goes back in the circle "for now", with a stronger warp and a lot more shade; the circle has no hard edge
- [x] Concave warp, a wider TV shade, and a selection glow that fades between toys (Tom)
- [x] Loop test: Fire plays a seamless 3 s loop in the tube while it is in hand
- [x] Tom: the middle is empty with no toy in hand; no counter; no All toys link; the glow has no hard edge; the tube is a little wider
- [x] Tom: the Re-roll stands under the clock; left alone, the clock runs through its toys by itself
- [x] Selection light: Tom picked Halo, in soft white
- [x] Tube: a wider radius, a slow rolling change between toys, and the words drawn in the picture
- [x] Tube: wider than the clock; a CRT warble; the name's letters askew; a quick cross-fade between toys (the top-down roll was rejected)
- [x] Font trial: every heading in B612. It shipped with the merge (Tom: "we will launch this now"); it stays until Tom ends it
- [x] Tube: a colour CRT with an image tube's grain, after the oscilloscope and the railgun sight; the selection darkens the picture under the toy
- [x] Footer: an OKLCH mesh glow that leans to the pointer; the mark set into the credit line
- [x] Redo the radial animation and the clock's intro: a head sweeps the rim and brings each toy in at its hour; the tube blinks on to snow and off to a dot
- [x] A loop for every toy: round 2, 42 loops, 5 to 8 s, 1.9 MB
- [x] One at a time, with Tom: the footer (a shader) and the onnozelaer mark (in the credit line); Tom kept the stack layout inside the clock
- [x] One still per main-shelf toy in shared/stills/ (Tom chose captured stills): 42 stills, 896 KB; tools/stills.mjs renews them
- [x] Version 0.11 (Tom: keep the per-toy rule); AGENTS.md and README say what changed
- [x] Checked at desktop width and in a 375 px frame; a failed script load keeps the flat shelf
- [x] PR 65 merged into main (b6061261, 2026-11-16); Cauldron, new on the main shelf, got a still in the merge

## Summary of Changes

- The Clock is the menu's default view: twelve toys from the 43-toy main shelf on a dial, a Re-roll under it, and a comet intro that drops each toy off at its hour through the menu's grainy blur. `?all` keeps the whole shelf with the Series switch and the Lab link; `?lab` is unchanged.
- The toy in hand shows in the middle on a colour CRT tube (`shared/menu/tube.js`): its still or its loop, its name and motto burned in, a soft wedge cut toward the toy, and a quick cross-fade between toys.
- The footer glow is a small OKLab shader (`shared/menu/mesh.js`); the onnozelaer mark sits in the credit line. The wordmark flashes in the footer's hues.
- 43 stills and 42 loops in `shared/stills/` and `shared/loops/`; `tools/stills.mjs` and `tools/loops.mjs` renew them.
- Version 0.11. Docs: `AGENTS.md`, `README.md`, `DESIGN.md`.
- Open, not in this bean: the B612 heading trial ends when Tom says so; Cauldron has a still but no loop yet.
