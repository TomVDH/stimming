---
# stimming-9zar
title: 'Star catalog: clean up the star tray'
status: in-progress
type: task
created_at: 2026-11-25T02:57:47Z
updated_at: 2026-11-25T02:57:47Z
parent: stimming-e35i
---

Tom, 2026-11-24: "The [star] tray needs to be cleaned up -- most others are good."

- [x] Tom names what to clean up (2026-11-24): "display is messy -- star icons cheap"
- [x] Tom picks the ingredients (2026-11-24): grouped by kind of body; the toy's own render, pre-baked; integrated with the bar, in its look
- [x] Flipbooks with alpha on every body (Tom, 2026-11-24): 12 frames of 64 px per turn, colour over a grey alpha row used as a luminance mask (`solarloop/bake.js`, `solarloop/tray/`); each body at its own size on a log scale (Tom)
- [x] Menus and labels in B612, the Airbus face (Tom, 2026-11-24); the bar keeps Iosevka
- [x] The grid did not work (Tom, 2026-11-24): back to one ribbon with excellent UX; bodies float in the middle of even cells; names in Iosevka, quiet labels in B612
- [ ] Build, show, Tom looks
- [x] Budget: 64 px and 12 frames, about 16 KB each, so the toy stays inside its 1 MB budget and the tray lands on main (Tom, 2026-11-24: land WIP)
- [ ] Tom picks the flipbook size: 96 px and 16 frames put the toy at about 1.35 MB, 128 px and 24 frames at about 2.5 MB; either needs his yes, over the 1 MB toy budget: Tom's yes
- [ ] Bake the objects session's new bodies once they land on main
