---
# stimming-3y1g
title: 'Rain on glass icon: flat-shaded redraw with teardrops'
status: completed
type: task
priority: normal
created_at: 2026-11-03T22:12:34Z
updated_at: 2026-11-03T22:20:02Z
parent: stimming-io49
---

Tom first asked for an iso riff on the current shaded icon. He then asked to redo the current one flat shaded: it is too busy, and the luminosity mask does not translate well.

- [x] Flat-shaded pane in the Rain tile: three lights, three teardrops
- [x] Hover: entering releases the nearest drop; a touched drop runs to the sill
- [x] Emblem redrawn to match
- [x] icons/picks.json records Current; A stays on the sheet
- [x] Menu QA at 1280 and 375 with a clean console; screenshots for Tom
- [x] Commit own hunks through a private index and push

## Summary of Changes

- The Rain tile is a flat-shaded pane: hard tones, no gradients, three lit discs and three teardrops. It replaces direction A in the menu; A stays on the sheet.
- Hover: entering releases the nearest drop, and any drop the pointer touches runs to the sill with a flat trail. Focus runs the big drop.
- The emblem is a white pane with the teardrops cut out, so the luminance mask reads as rain.
- An iso slab was drawn first, shaded and flat. Neither shipped: Tom asked for a redo of the current one, and the iso gets busy at small sizes.
