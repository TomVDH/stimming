---
# stimming-ptkk
title: 'Menu: Domino run icon is direction D, the isometric run'
status: completed
type: task
priority: normal
created_at: 2026-11-03T22:13:01Z
updated_at: 2026-11-03T22:15:35Z
parent: stimming-8o1b
---

Tom picks the isometric icon for Domino run. Port direction D from icons/spike-8.html to the menu.

- [x] Tile draws the isometric run; hover topples it
- [x] Emblem matches: shared/emblems/domino.svg
- [x] icons/picks.json records D
- [x] QA at 1280 and 375 px, clean console, menu script parses
- [x] Commit through a private index and push

## Summary of Changes

The menu tile draws direction D: six rainbow blocks on a plate. Hover topples the run; leave stands it back up. The emblem is domino-d.svg, picks.json records D, and the brut accent selector follows the new markup. QA at 1280 and 375 px: clean console, tile paths match the emblem.
