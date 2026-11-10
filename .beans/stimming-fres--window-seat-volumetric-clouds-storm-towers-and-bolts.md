---
# stimming-fres
title: 'Window seat: volumetric clouds, storm towers and bolts'
status: in-progress
type: task
priority: normal
created_at: 2026-11-04T23:30:00Z
updated_at: 2026-11-10T08:49:38Z
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

Round 5 (Tom: the deck as the towers; gentler storms; more variety): the deck is now cumulus domes with flat bases. A cell map sets each dome's height. Tower-style billows (three Worley sizes, plus fine lumps near) break the surface; the edge is crisp near and soft far. Crease light: crowns catch the sky, folds do not. In a storm the deck takes the towers' dimmed sun, murk dome and flat murk light, so both read as one. Storm slider eases over about 20 s (was 5). Cells tower up over 45 s, die back over 40 s, arrive every 6 to 14 s. Four cell kinds: towering cumulus (no anvil, 7 to 10 km, little rain and lightning), multicell cluster (side turrets nearly as tall), decaying cell (wide anvil, frayed column), mature Cb (varied anvil and lean). Steep banks: one turn in five rolls briskly to 14 to 28 degrees, so the ailerons and spoilers move more.

Fog banks (Tom): the veil's grain is now long sheets along the flight line that stream aft (it was noise on a sphere round the eye). The wing takes the same near-fog streak field in its own materials: eight taps from the eye to the skin hide stretches of it, in the outside murk's colour. Rough air in a bank flexes the wing: two damped springs (1.1 Hz and 3.2 Hz), kicked by gusts; the tip lights ride the bend. A brown-noise rumble, low-passed near 100 Hz with a 48 Hz body, swells with the bank and buffets with the turbulence.

Fog round 2 (Tom: still a sphere): the near fog is now curtains: tall, thin sheets parallel to the cabin (136 m along the flight line, 30 m tall, 9 m thick), marched in 16 jittered steps to 32 m. A ray out of the window crosses several, so each veils its own stretch of wing; the wing's materials march the same field. The far veil lost its sphere pattern and thickens to under 1 km in a thick bank, so gaps between curtains stay grey. The wingtip strobe burns up to six times brighter by day.

Arcade ramp (Tom): the storm builds in about 4 s and calms over about 20 s. While it rises, cells arrive every 1 to 3 s in view and boil up in 12 s (30 s when steady). Each cell fires a burst of two or three flashes as it matures. A big push on the slider answers at once with a flash in the nearest cell (or the deck) and a lurch.

Fog round 3 and lightning (Tom): wing-sized fog banks (408 by 80 by 26 m) join the curtains, so the tip can vanish while the root stays. The strobe and nav light scatter in the fog round the tip, in the outside pass and the wing's own fog; their flares swell in a bank. Far flashes light the cabin and the murk by 1/(1+(d/40 km)^2) and 1/(1+(d/50 km)^2), so horizon storms stay on the horizon. In-cloud flashes come every 4 to 15 s per cell; a mature cell sometimes boils over with 6 to 12 quick flashes. Flash colour is one bluer constant; inner flashes are about 35 % brighter; far towers' flashes are boosted through the haze. Bolts branch twice and carry a core, a blue glow and a violet halo. Horizon storms flicker 180 to 320 km out. The rocket launches 45 to 80 km out. The cabin bed passes two 3 kHz low-passes: it removes an 11 kHz whine and dulls clinks.
