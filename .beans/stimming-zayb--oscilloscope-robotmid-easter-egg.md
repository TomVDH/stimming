---
# stimming-zayb
title: 'Oscilloscope: song easter eggs (codewords)'
status: completed
type: task
priority: normal
created_at: 2026-11-18T04:28:50Z
updated_at: 2026-11-18T09:11:28Z
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

- [x] Beat: the main voice's right channel now plays a consonant interval by pitch class, so each note ties its own knot (done 2026-11-17).
- Identify the right main and mini voices for the songs other than stars and monday.
- Full-mix synth tracks (Synthesizer and 8-bit parts) still play on page synths; tune them to the site's settings.
- Shared bar: mode choices are 8 px shorter than actions, so their hover box is smaller (Tom to pick: all toys or scope only).

- 2026-11-18: songs now: stars, model, monday, around, beat, plastic, whirling, dota. STOP tag and X stop a song; a click does not. Every song starts on the scope voice.

- [x] On start, the egg hint lists every codeword once (7 s), then cycles one word at a time.

- [x] INVISIBLE (Duran Duran, arr. horsecel): eight minis; at 5 s an ASCII portrait pixelates in, holds 5 s and fades. Codeword buffer now 12 letters.

- [x] YAKUZA (Baka Mitai, arr. RiceLover423): twelve minis, Kiryu portrait at 5 s. Portraits are 100 columns, each level its own brightness; the scopes, minis and bezels ease out under them.

- [x] Typing 'hint' lists every codeword again (7 s) while no song plays.

- [x] DENTAKU (Kraftwerk, anonymous arr.): trombone vocal on main, eight minis.

- [x] DENTAKU moved to the final mix (5749966); TOUR added (Tour de France, arr. Arustyteakettle) without its breathing.
