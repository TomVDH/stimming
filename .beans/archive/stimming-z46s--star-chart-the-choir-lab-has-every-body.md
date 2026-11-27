---
# stimming-z46s
title: 'Star Chart: the choir lab has every body'
status: completed
type: task
created_at: 2026-11-25T07:34:23Z
updated_at: 2026-11-25T07:34:23Z
parent: stimming-e35i
---

Tom, 2026-11-24: "LETS UPDATE THE CHOIR TOOL TO HAVE THE LATEST BODIES".

- [x] Every one of the 35 bodies has a choir preset; the ten new ones start from their nearest relative (from() in choir.js)
- [x] Fomalhaut's voice moves from the old id j1407, so Fomalhaut no longer falls back to the Sun's voice
- [x] New bodies take their relative's levels until the lab measures them
- [x] The lab lists every body, in six groups

## Summary of Changes

choir.js: fomalhaut keys, from(), ten presets, level carry-over. sound.js: Fomalhaut's root. lab.html: names and groups. Doc line.
