---
# stimming-p86e
title: 'Solar loop: songs for the stars'
status: in-progress
type: task
created_at: 2026-11-24T20:58:18Z
updated_at: 2026-11-24T20:58:18Z
parent: stimming-oh7b
---

Each star gets its own song, shaped in the choir lab and played by the toy. Plan: per-star harmony, chord progressions (library and step editor), voicing, melody style, echo type, an analog pad instrument, the old organ wave, zoom keyframes and layers (one mix for all stars), taps in the current chord with live edits, old versions as editable presets.

- [x] Betelgeuse: Tom's new standard choir (2026-11-24); harmonic series once harmony is per star
- [x] Engine: per-star harmony, progressions, voicing, melody style, echo type
- [x] Engine: analog pad, old organ wave, layers, current chord, seeded randomness
- [x] Taps: blast on the chord root, glow arpeggio, glow shape, stack switch, live edits
- [x] Old versions as presets (legacy.js), progression library, zoom keyframes
- [x] Toy: chord taps, zoom mix and layers
- [x] Lab: song section, step editor, analog, tap, zoom graph, versions and compare, repeat tap
- [x] Starting songs per star
- [ ] Loudness re-match after Tom tunes the songs (not Betelgeuse)
- [x] Offline tests: Sun unchanged, progressions, taps, zoom, organ
- [x] Docs: Sound section
- [ ] Tom listens before any push

## Findings, 2026-11-24

- The Sun renders as before: a seeded 30 s render of the old and new engine differs by at most 0.00000003.
- The organ choir maps onto the lab settings at gain 9.25, measured against the old code on three roots (9.09 to 9.33).
- A steal fade had no anchor event, so a stolen tap faded over its whole life: middle taps of a burst sat 3 to 15 dB low. The fade now starts at the steal: 10 taps 2.5 s apart sit within 0.4 dB of one tap.
- Live tap edits: the glow level set to 0 mid-glow drops it from -22.6 dB to silence at once.
