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
- [x] Flipbooks with alpha on every body (Tom, 2026-11-24): 24 frames per turn, colour over a grey alpha row used as a luminance mask (`solarloop/bake.js`, `solarloop/tray/`); each body at its own size on a log scale (Tom)
- [x] Menus and labels in B612, the Airbus face (Tom, 2026-11-24); the bar keeps Iosevka
- [ ] Build, show, Tom looks
- [ ] Budget: about 70 KB a flipbook at 128 px, about 2.5 MB for 36 bodies; 96 px and fewer frames cut it, over the 1 MB toy budget: Tom's yes
- [ ] Bake the objects session's new bodies once they land on main
