---
# stimming-4aaq
title: 'Credits: a public attributions page with every outside credit'
status: completed
type: feature
priority: normal
created_at: 2026-11-25T05:21:04Z
updated_at: 2026-11-25T05:44:47Z
---

Tom (2026-11-24): "we need to make an attributions page". ColorSym (open source, colour-blind access) must be on it.

## Checklist
- [x] Gather every credit: CREDITS.md rows, eastvan/CREDITS.md, tools/vancouver/bake.py, pinned libraries, fonts, ColorSym
- [x] Find credits CREDITS.md misses and list them for Tom
- [x] Draft the page in the house look
- [x] Screenshot the page locally
- [x] Keep CREDITS.md and the page in step (rule or generator)
- [x] Tom answers: page path and where it links from (2026-11-24: credits/, footer link; bean stimming-aqbp)
- [x] Tom answers: how to list the Oscilloscope songs (2026-11-24: one line, no titles)


## Notes

- Draft: `credits/index.html`, static, no script. Not committed: commit.sh pushes, and a push publishes.
- Added to CREDITS.md and the page: Rain (Radiant), three.js volume fire port, Ashima noise, Hash without Sine, ACES fit (Hill), Quilez formulas, Tilt Neon and Courgette, OSM for four more toys, swisstopo, BLW, BAFU; toy lists for Fog horn, Washing line, Train Ride.
- For Tom, source unknown: fireworks/sfx, glass/gunshot, trainride/sound and window/cabin.mp3 (freesound via Pixabay?), Vlootzak renders (Havoc), drone/airframe.js (client intro?), window/ode.js (traced from a game map).
- Ported MIT code without its notice in the file: Hash without Sine, ACES fit, the fire port.
- The Pages workflow skips *.md, so the OFL texts in shared/fonts never ship. Needs a shared/ bean.
- At publish: flip the Credit shown column to the page.


## Summary of Changes

`credits/index.html` is the public credits page: static, no script, on `shared/stim.css`. Seven groups: code libraries, ported code, type, access (ColorSym), data, models and images, sound and music. Each entry gives what, by whom, licence with a link, and which toys use it. The Oscilloscope songs show as one line with no titles (Tom). `CREDITS.md` gains the rule that a new row also goes on the page, ten missing rows, three toy lists, and Credit shown now points at the page. The open source questions above stay with Tom.
