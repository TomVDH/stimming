---
# stimming-5q2y
title: 'Star Chart: fix article initial flash and redo animated menu icon'
status: completed
type: bug
priority: normal
created_at: 2026-11-27T06:47:03Z
updated_at: 2026-11-27T06:49:15Z
---

Fix two Star Chart issues (Tom, 2026-11-26):

- [x] Fix article card initial full-visibility flash on second `i` press (`starchart/article.js`, `starchart/article.css`)
- [x] Redo and animate the Star Chart menu icon in `index.html` (bold golden-white blazing star with corona, magnetic prominence arc, crisp centered anamorphic flare, lens ghost, and 30 fps looping + pointer-reactive animation)
- [x] Update `shared/emblems/starchart.svg` to match the centered star + flare silhouette
- [x] Verify syntax across `starchart/article.js`, `starchart/article.css`, `index.html`, and `shared/emblems/starchart.svg`

## Summary of Changes

- Fixed the initial full-article flash on the second `i` press in `starchart/article.js` and `starchart/article.css`: applied `.is-shut` to all article lines before appending to the DOM (before `syncFade()` forces layout) and disabled transition while `.is-shut` is active.
- Redid the Star Chart menu icon in `index.html` as a bold golden-white star with warm corona, two magnetic prominence arches, a centered horizontal anamorphic flare + vertical spikes, active flare knot, and counter-tracking optical lens ghosts, driven at 30 fps via `kit.hook` and `kit.clock`.
- Updated `shared/emblems/starchart.svg` to match the centered star, horizontal flare, and prominence silhouette.
