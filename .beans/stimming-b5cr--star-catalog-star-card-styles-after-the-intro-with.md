---
# stimming-b5cr
title: 'Star catalog: star card styles after the intro, with the object type'
status: in-progress
type: task
priority: normal
created_at: 2026-11-24T23:12:15Z
updated_at: 2026-11-24T23:34:50Z
parent: stimming-e35i
---

Tom, 2026-11-24: "lets actually redo some styles for the info callout (we also want celestial object type in there) -- maybe some that match our intro styling".

- [x] Every object's type in plain words and its class (facts.js type)
- [x] Rows as label and value pairs
- [x] Styles: Intro (default; the name flashes and opens, lines wipe on), Stamp (white box, hard offset shadow), Caption (typed); Dev Card style; a new style plays at once
- [x] Checked all three on the Sun at 1280 x 800; clean console
- [ ] Tom picks a style

## Switch timing (Tom, 2026-11-24)

- [x] Tom keeps Intro as the card style
- [x] A star switch fades fully to black (the whole frame, glare, stars and grain too)
- [x] The new card waits until 1.75 s after the light returns; measured 1.76 s

- [x] A spectral class row first on the card; the type line keeps the plain words (Tom: "in the intro we'd like a spectral class readout as well")

- [x] Our Sun's outline at the star's scale above the card: a circle, a speck, or the top of its circle; checked on Betelgeuse, Arcturus, Procyon, the Sun and the pulsar (Tom: "an outline of our sun's diameter above the intro call out")

- [x] Dev: Star card, Show plays the card at any zoom (Tom: "add dev mode option to trigger the intro card irrespective of zoom")
