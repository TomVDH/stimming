---
# stimming-wvxj
title: 'Lab: temp tiles for the new batch toys'
status: completed
type: task
priority: normal
created_at: 2026-11-15T09:33:14Z
updated_at: 2026-11-15T10:42:33Z
---

Tom asked for temporary Lab icons for the batch toys that already have a page (2026-11-15).

- [x] Ten temp tiles in the Lab menu, one pulse loop each (`data-temp` on the svg)
- [x] Ten `toys.json` entries (Dutch names, mottos and series stay null for Tom)
- [x] Swap each temp glyph for the toy's own icon when its agent hands it over
- [x] Add tiles for Car wash, Rupert's drop, Wind tunnel and Soup cauldron when their pages exist

## Summary of Changes

Fourteen new Lab toys are in the menu and in `toys.json`: Crossing button, Turing skin, Firefly sync, Mesh ball, Pressure washer, Steel wool, Lava skin, Schlieren candle, Purr, Cuttlefish skin, Car wash, Rupert's drop, Wind tunnel, Soup cauldron.
Each tile has the toy's own icon and hover block from its build agent. The temp glyphs and the temp helper are gone.
Series for the last four are proposals: Wind tunnel and Rupert's drop in `science`, Car wash in `vistas`, Soup cauldron in `goo`.
Checked in the real Lab menu: all fourteen tiles react to the pointer, no page errors.
