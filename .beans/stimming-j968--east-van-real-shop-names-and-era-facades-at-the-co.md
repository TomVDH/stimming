---
# stimming-j968
title: 'East Van: real shop names and era facades at the Corner'
status: completed
type: task
created_at: 2026-11-15T05:58:12Z
updated_at: 2026-11-15T05:58:12Z
parent: stimming-guw5
---

Tom, 2026-11-14: source business names and building styles from public repositories. Tom chose real names (plain text, no logos).

- [x] Fetch: storefront names (City), tax roll build years (City), heritage register (City), OpenStreetMap buildings and places (ODbL)
- [x] Bake into drive.json: name per shop unit, year per lot, levels and names per building
- [x] Signs: real names on the sign boards, one texture atlas
- [x] Facades by era: before 1940, 1940 to 1979, 1980 on; a nameplate for The Highland (1911)
- [x] Tests; credits; check in the pane

## Summary of Changes

- bake/drive.py fetches storefront names, the tax roll (build years), the heritage register and OpenStreetMap (building floors, roofs, start dates, names; named places). 10 of 21 lots in the disc have a tax-roll year; OSM fills The Highland (1911).
- drive.js: each frontage takes an era (before 1940 early, 1940 to 1979 post-war, 1980 on modern; no year: early, or post-war at 4 floors and up) with its own walls, awnings and upper windows. Shops show their names on record; a vacant unit reads FOR LEASE. The Highland carries a nameplate.
- town.js: all signs of a module draw from one canvas atlas (one draw call), in the page font.
- Tests: names on record, era by year, the nameplate.
- Not done: a shop's sign does not dim when its lights go off.
