---
# stimming-ok33
title: 'Menu tube: less faded, deeper colour'
status: completed
type: task
priority: normal
created_at: 2026-11-16T18:32:25Z
updated_at: 2026-11-16T18:36:36Z
---

Tom, 2026-11-16: "for the crt filter display on the main page -- can we make it a little less faded out -- and have more deeper colours".

## Checklist

- [x] Less faded: the picture's level is 0.19 (was 0.13); the dimming away from the middle is 0.52 (was 0.68).
- [x] Deeper colour: the picture's saturation is 1.85 (was 1.45); the glow keeps its hue (saturation 1.6, was ungraded).
- [x] Compare before and after on fixed stills (lava, soap): lightness +15%, colour strength +60% in the middle.
- [ ] Tom looks at it in the menu.
- [x] Commit and push.

## Summary of Changes

`shared/menu/tube.js`: level 0.19, rim dimming 0.52, picture saturation 1.85, glow saturation 1.6. Tom approved it on 2026-11-16.
