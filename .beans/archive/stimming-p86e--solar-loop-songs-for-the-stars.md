---
# stimming-p86e
title: 'Solar loop: songs for the stars'
status: completed
type: task
priority: normal
created_at: 2026-11-24T20:58:18Z
updated_at: 2026-11-27T07:19:52Z
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
- [x] Loudness normalized across every body (Tom, 2026-11-24): NORM per star, K-weighted at 44.1 kHz with a fixed seed; Tom's per-star level is a trim on top, 0 dB for all. In the toy at 44.1 kHz the Sun, Betelgeuse, the neutron star and 3C 273 sit within 0.9 dB
- [x] Offline tests: Sun unchanged, progressions, taps, zoom, organ
- [x] Docs: Sound section
- [x] Tap bench: a level per tap voice (saved), mute and solo, an envelope and filter graph, meters for choir, taps and total, a burst of 10, tap strength (Tom, 2026-11-24)
- [ ] Tom mixes taps against the choir on the bench: on VY Canis Majoris a tap sits about 20 dB over the choir
- [x] Sound for the new bodies: cygx1, sgra and qso keys, presets and lab entries; the zoom mix corrects a hole's farther full view (2026-11-24)
- [ ] Sound for each next body the objects session announces; snd.drop and snd.tear for a star falling into a hole (bean mhpz)
- [x] Swell follows the Turn speed (swTurn, Beta Lyrae): setTurn in choir and sound, a Turn control in the lab (Tom, 2026-11-24)
- [ ] main.js passes 10 ** turn.lr to snd.mixLayers as a fourth argument (visuals chat)
- [ ] Tom listens before any push

## Findings, 2026-11-24

- The Sun renders as before: a seeded 30 s render of the old and new engine differs by at most 0.00000003.
- The organ choir maps onto the lab settings at gain 9.25, measured against the old code on three roots (9.09 to 9.33).
- A steal fade had no anchor event, so a stolen tap faded over its whole life: middle taps of a burst sat 3 to 15 dB low. The fade now starts at the steal: 10 taps 2.5 s apart sit within 0.4 dB of one tap.
- Live tap edits: the glow level set to 0 mid-glow drops it from -22.6 dB to silence at once.

- [x] Glow tapers in and blends (Tom, 2026-11-24: the tap glow was still too loud). S-curve rise over 6 s, arpeggio notes ease in over 0.6 s, peak 0.015. The tap's reverb send no longer divides by norm, so a loud room cannot swamp the choir. GLOWNORM trims the loud stars. Glow lift per star: 0.4 to 1.9 dB (was 0.7 to 18 dB on the neutron star).

- [x] The lab lists Fomalhaut (A3 V) in the main sequence, between Sirius and Procyon, not with the young stars.
