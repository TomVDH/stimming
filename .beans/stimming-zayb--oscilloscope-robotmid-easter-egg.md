---
# stimming-zayb
title: 'Oscilloscope: song easter eggs (codewords)'
status: completed
type: task
priority: normal
created_at: 2026-11-18T04:28:50Z
updated_at: 2026-11-18T06:32:09Z
---

Tom (2026-11-17): the scope plays songs as easter eggs. Tom accepts the licence risk and removes a song if it causes trouble.

- [x] Small MIDI parser, no new library
- [x] Scope voice: main scope plus a ring of minis, sound = picture
- [x] Codewords: stars, monday, around, beat, plastic
- [x] O fades to a full mix on Online Sequencer samples
- [x] Title, artist, year, label up the right edge
- [x] Glitch hint names each codeword in turn
- [x] Teal default phosphor, teal bar; six more phosphors; Sonar ghost pass
- [x] CREDITS.md and release-ready entry
- [x] Commit and push

## Summary of Changes

- `scope/index.html`: tape engine. Each song: main voice, minis in an even ring, sampled full mix (O), readouts, vertical credit line.
- Robot.mid and the Proton wobble were dropped on Tom's word. Plastic was replaced by Tom's full export.
- Minis: brightness limiter, eased centre pips, graticule masked inside; Dev toggle Hide idle minis.
- Phosphors: P1, P2 TEAL (default), P11, P19, P22, P39. Ghost pass after Sonar.
- Files: five MIDI files and five sample kits in `scope/`, about 13 MB.
- around.mid is You Spin Me Round (Dead or Alive, 1984, Epic).
- Open: the shared bar hover for mode choices (Tom to pick).

- 2026-11-17 later: scroll on a mini sets its volume (thick inner arc, dB readout); each part plays through its own live gain. Silent minis rest as a steady centre dot in both modes. Open: identify the right main and mini voices for the other songs (Tom: later).

## Open (Tom, 2026-11-17, for a later session)

- Beat: the vocal on the main scope keeps one shape. A single note always draws a circle; only chords change it. Give the main voice a shape that follows pitch or tone.
- Identify the right main and mini voices for the songs other than stars and monday.
- Full-mix synth tracks (Synthesizer and 8-bit parts) still play on page synths; tune them to the site's settings.
- Shared bar: mode choices are 8 px shorter than actions, so their hover box is smaller (Tom to pick: all toys or scope only).
