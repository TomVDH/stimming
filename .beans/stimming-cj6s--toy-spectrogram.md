---
# stimming-cj6s
title: 'Toy: Spectrogram'
status: in-progress
type: feature
created_at: 2026-11-22T13:05:17Z
updated_at: 2026-11-22T13:05:17Z
parent: stimming-oh7b
---

Idea 54 in docs/toy-ideas.md, group B. Tom asked for it as its own toy, batch 3 of the Lab run (2026-11-22).

Play a small synth; the sound scrolls past as a waterfall of colour.

Brief (Tom): MVP at high fidelity, with icons for the Lab and the intro, Bar v3.

Defaults (chosen in this chat, stated for Tom): flat, not 3D; raw WebGL2 (Shader type). The instrument is a theremin pad: the pointer's height is the pitch, its left and right the brightness. Pitch runs up the stage on a log scale, so the pen line sits under the finger. The paper runs only while a note sounds, so the drawing stays when you stop. Keys A to K play eight notes for chords. Plan: docs/plans/spectrogram.md.

- [x] Development plan in docs/plans/spectrogram.md (MVP)
- [x] Blockout on the stage, screenshot at 1280 x 800
- [x] Voice model, paper ring, pen
- [x] Shading: ink, smoke, slit, bloom, grade
- [x] Sound: additive voices, chiff, room; muted by default
- [x] Bar v3 spec
- [x] Icon round spike-spectrogram-1 (Current, A, D), sheet GALLERY row
- [x] Emblems a and d; intro emblem shared/emblems/spectrogram.svg; favicon
- [x] toys.json entry and Lab li with GSAP hook
- [x] QA Q1 to Q10 at 1280 px and 375 px
- [x] Toy doc docs/toys/spectrogram.md
- [ ] Commit and push
- [ ] Tom's sign-off

## Notes

- Blockout: docs/qa/spectrogram/01-blockout-1280.jpg (too dim), then 02-first-frame-1280.jpg after the tune. Hero captures: 03 to 10 in the same folder.
- The waterfall reads the voice model, not an AnalyserNode: mute suspends the context, so an analyser goes blank. The Web Audio voice takes the same partial table, cutoff and envelope. Never the microphone.
- Q10: 16.6 ms mean, 16.8 ms p95 during a drag (headless Chromium, ANGLE GL, Tom's PC). Tom checks on a real screen.
- Settle: the paper coasts about half a second after the last release tail; the loop then stops.
- Icons: no pick in icons/picks.json, so A of spike spectrogram-1 is on the menu.
- Open for Tom: 3D or flat (flat by default), the Dutch name (draft Spectrogram), the icon pick, a listen-through of the sound.
