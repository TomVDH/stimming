---
# stimming-fres
title: 'Window seat: volumetric clouds, storm towers and bolts'
status: in-progress
type: task
priority: normal
created_at: 2026-11-04T23:30:00Z
updated_at: 2026-11-08T10:29:43Z
parent: stimming-w1nd
---

Round 5, phase 3. Needs the two-pass render from stimming-kws3.
Today the deck is a low-contrast noise smear, and the tower reads as a smoke plume.
Tom picked all four: volumetric deck, better towers, visible bolts, high cirrus and haze.

- [x] Deck: a raymarched slab at about 1.5 to 3 km. 12 steps at Standard, 24 at High
- [x] Deck light: the sun or moon and the sky from above; the towns from below
- [x] Cirrus: a thin streaky layer near 12.5 km that catches the sun and moon
- [ ] Haze bands in the scattering
- [x] Towers: true volumes inside bounding cylinders, so only pixels that touch a cell pay
- [x] Towers: cauliflower billows, a sheared flat anvil, inner lightning that lights the volume
- [ ] Bolts: a branching stroke built in JS for the brightest flash. Cloud to ground below the base; short crawlers in the anvil
- [ ] Screenshots to Tom: each Cloud setting, Storm at full

## Notes

- Towers march only inside a bounding cylinder. A shape-following bound skips empty space; one smooth tap gives the light.
- Cost, leaned in, Standard, on the dev Mac: 79 fps without towers, 48 fps with six towers before the last trim (step 0.6 km, 32 steps). Not yet timed on an office laptop.
- Round 2 (Tom: clouds volumetric throughout, real translucency): one baked 64^3 noise volume (`window/noise3d.js`, about 0.2 s) feeds every layer.
- Deck: true 3D density with Worley erosion; light marched toward the sun or moon (3 taps Standard, 5 High); two-lobe phase, multiple-scatter tail, powder; town light filtered up through the base.
- New mid layer of thin altocumulus at 5.2 to 6.1 km. Cirrus is now a volume, with a 22 degree halo round the sun or moon.
- Towers sample the same volume instead of hashed noise. Frame rate not yet timed after this change.
- Round 3 (Tom): aurora at Midnight (Settings, on by default): two wavy curtains 400 and 560 km out, green low, faint red high, violet lower edge; streaks slide along; it tints cloud tops and the cabin green.
- Horizon fix: the deck no longer stops at 160 km; its steps grow toward the horizon. Cloud cover uses non-tiling noise.
- Towns: lamps line each town's own street grid, with avenues and three lamp colours; the glow is softer.
- Round 4 (Tom: things look weird): smooth cubic fetch of the noise volume ends blocky cloud edges; far deck uses a blurred closing sample and haze, the mid layer fades with distance; towns cross-fade street grids where they meet, streets bend, rural lamps shrink; the aurora gains folds, a wavy lower edge and a soft wing reflection.
- Round 5: Tom found the clouds had regressed after the tiling fix. Cover reads the noise volume again at two turned, odd scales (no repeat, cumulus clusters kept); the night sky dims alone (skyK). Streets are now lit avenue stretches over scattered house lights. Tom: looks better.
