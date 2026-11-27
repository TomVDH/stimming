---
# stimming-t1h5
title: 'Icon mask schemes: try a shared shape for menu icons'
status: scrapped
type: spike
created_at: 2026-11-25T05:18:15Z
updated_at: 2026-11-25T05:18:15Z
---

Tom (2026-11-24): "we need a better icon standardization - masking scheme -- like circles, hexes, diamonds or some other shape -- idk -- let's try a couple".

Question: which shared mask shape makes the menu icons read as one set?

Workbench: `icons/spike-masks-1.html` (noindex). Eight live main-shelf icons, copied from `index.html`, in five schemes. `index.html` and the icon standard do not change until Tom picks.

## Checklist
- [x] Read standards, icon guide, menu doc
- [x] Pick eight icons: Prism, Fidget board, Heat putty, plus five silhouettes
- [x] Build the page: circle, hex, diamond, squircle, one more
- [x] Show clipped and break-out variants for one shape at least
- [x] Show 128, 64, and the real tile size with labels
- [x] Screenshot and show Tom
- [x] Note Tom's reactions here
- [x] Round 2 (`icons/spike-masks-2.html`): offset, shaded and strange shapes, each with and without fill
- [x] Show Tom round 2

## Notes
- Icons: Prism, Fidget board, Heat putty, Fire (tall), Lava lamp (tall), Bubble wand (round), Zena (wide), Googly eyes.
- The page fetches `index.html` at run time and runs its icon script off screen. Each mask shows the live icon through `<use>`. Pointer events relay to the source tile. No icon is copied by hand.
- Schemes: Circle clipped, Circle break-out, Hex ring (series style), Hex break-out, Diamond break-out, Squircle clipped, Niche (own idea: an arch with a shared floor line).
- Backing toggle: toy hue, one ink, ring only.
- First screenshot shown to Tom 2026-11-24.

- Round 2 schemes: Offset disc (low right, object free), Misprint (hex fill and line off register), Shaded dome, Puck (shaded plinth, object stands on it), Blob, Wave (twelve lobes, clipped), Leaf. Each shows filled and with no fill.

## Tom's reactions
- 2026-11-24, round 1: "lets try offset or shaded or strange shapes -- i like the direction -- let's also ahve with no fill"
- 2026-11-24, after round 2: "we want the regular first round with no fill as option too". Round 1 now has a No fill button (was Ring only) and a fixed no-fill matrix at 128.
- 2026-11-24: "lets not g with shape masks -- isntead let's get the most recent icon sheet out". The icon standard stays as it is.

## Reasons for Scrapping

Tom chose no shared mask shape. The two rounds stay as reference: `icons/spike-masks-1.html` and `icons/spike-masks-2.html`. The sheet work moved to stimming-xl0w.
