---
# stimming-x27w
title: 'Window seat: panes, glass wear, bezel and shade'
status: in-progress
type: task
priority: normal
created_at: 2026-11-04T23:30:00Z
updated_at: 2026-11-10T08:23:17Z
parent: stimming-w1nd
---

Round 5, phase 4a. Tom wants a better window, frame and shade.
Today the wall is a flat plane, the bezel is one smooth box, and the shade is a thin bar.
Tom picked pane depth, glass wear, moulded bezel and a moulded shade.
Out: cabin wall detail, shade light leaks, the physical slide, shade sound.

- [x] Three panes: the scratch pane with its breather hole, the inner pane about 1 cm out, the outer pane about 3.5 cm out in its own sharper skin opening
- [x] Between the panes: parallax, a rubber gasket, glass edges that catch light
- [x] Scratches on the scratch pane light up as a halo round the sun, moon and lightning
- [x] Ice crystals at the bottom edge of the outer pane
- [x] A faint ghost of each bright source between the panes
- [x] Bezel: a rolled lip, a seam to the wall panel, soft occlusion in the corners
- [x] Shade: grained plastic with a slight bow; a chunky lip with a finger groove, lit along its edge
- [ ] Screenshots to Tom: shade up, half, down; head leaned in

## Notes

- Pass 1 now skips every pixel outside the skin opening, which is smaller than the scratch pane.
- The scratch halos and ghosts are built but not yet seen in the pane: the sun sat outside the window in the check.
- Tom asked for a larger, Dreamliner-like window: the visible glass is now about 27 by 47 cm, and the eye sits 40 cm from the wall.
- Tom swapped the pull-down shade for Dreamliner-style glass dimming (five levels; the tint spreads in from the rim). The last shade build is commit 7fc2126: restore `window/index.html` and `window/shader.js` from it to go back.
- Storm now starts at zero. The eye sits 33 cm from the wall, so the glass fills most of the frame height.

Round 6 (Tom: the reveal looked like a camera obscura; plastic is matte and textured): the reveal, gasket and wall no longer sample a mirrored image of the outside. Each face sums a 4 by 4 grid of patches on the skin opening (radiance times form factor). The sun or moon lays a sharp patch in the opening's shape; the wing and towers block it. The lit patch bounces onto the other faces and the wall. Dimmed glass tints all this light. Fine pebble grain (about 0.7 mm) tilts the normal; it fades with pixel size. The sheen is a low GGX gloss, roughness 0.55.

Seat (Tom): Settings has a Seat row: Wing L, Wing R, Aft L, Aft R (stimming.window.seat). Aft seats move the whole aircraft 3.2 m forward of the eye, so the wing sits up front and more ground shows. Right seats mirror the picture and the input; the wingtip nav light turns green.
