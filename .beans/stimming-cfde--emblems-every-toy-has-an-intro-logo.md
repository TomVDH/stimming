---
# stimming-cfde
title: 'Emblems: every toy has an intro logo'
status: todo
type: task
priority: normal
created_at: 2026-11-17T22:40:07Z
updated_at: 2026-11-17T22:45:06Z
---

Tom, 2026-11-17 14:39: every toy should have its intro logo (emblem). Audit toys.json emblem fields and shared/emblems/ files; list the toys without one.


## Audit (2026-11-17, after Zena's emblem)

115 toys in toys.json. 64 have no emblem; every emblem path on file exists.

- Main shelf (7): Fog horn, Mesh ball, Pressure washer, Jacob's ladder, Wind tunnel, Schlieren candle, Steel wool
- Lab (57): Ascent, Beer pour, Bench, Bismuth crystals, Broodautomaat, Calaeno, Canal at dusk, Car wash, Chocolate tempering, Coast and meteor, Coil, Crossing button, Crow wires, Cuttlefish skin, Dandelion, East Van, East Van postcards, Firefly sync, Flame test, Frost, Gear train, Glow paper, Harmonograph, Honey coil, Hot ice, Ice tray, Infinity cube, Kintsugi, Lantern lake, Lava skin, Marbling, Murmuration, Music box, Night viaduct, Observatory, Orbits, Peel, Phaeton, Plasma globe, Purr, Rubens tube, Rupert's drop, Sequin brush, Singing bowl, Slime, Snow globe, Spinning top, Split-flap, String harp, Subway, Terrarium, Turing skin, Ulam spiral, Wind farm, Worry stone, Zen sand, Zipper

Menu tiles: only Bench and Crow wires have none (Crow wires is in progress in its own chat). East Van postcards has no folder (stimming-e0qw).

Method, as for Tornado alley and Zena: the emblem is the white silhouette of the toy's picked icon (A) at 128, in shared/emblems/<id>.svg, and the toys.json emblem field. A toy whose icon is not picked gets an icon round first.

- [ ] Main shelf seven
- [ ] Lab toys with a picked icon
  - [x] stimming-zy58, 2026-11-17: Subway, Singing bowl, Marbling, Plasma globe, Snow globe, East Van postcards, Rupert's drop (A icons); Observatory (from main); Kintsugi, Crossing button, Wind farm, Harmonograph, Car wash (traced from Current)
- [ ] Lab toys that need an icon round first
