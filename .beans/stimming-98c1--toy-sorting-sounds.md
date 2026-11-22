---
# stimming-98c1
title: 'Toy: Sorting sounds'
status: in-progress
type: feature
created_at: 2026-11-22T20:10:59Z
updated_at: 2026-11-22T20:10:59Z
parent: stimming-oh7b
---

Build Sorting sounds (idea 9, group B) as a Lab toy: an MVP at high fidelity, Bar v3. A row of bars of random heights; pick an algorithm and the bars sort themselves, each compare and swap lit and voiced as a tone whose pitch follows the bar's height; a sweep plays the rising scale when the row is sorted. Plan: docs/plans/sorting.md.

Stack type: Shader (raw WebGL2 on shared/gl.js, bloom from shared/glow.js).

- [x] Plan at docs/plans/sorting.md
- [x] Blockout on the stage, screenshot at 1280 x 800 (docs/qa/sorting/01-blockout.jpg)
- [x] Six algorithms as generators, node test (tests/sorting-algos.test.mjs, 7 of 7 pass)
- [x] Hero moment: sort with glide, heat wake, tips, pivot light, sweep, sheen
- [x] Sound: struck-glass notes, voice budget, limiter, room, riffle, sweep scale, chord; muted by default
- [x] Bar v3 spec and copy; tap sorts or pauses, drag strums
- [x] Icon round spike-sorting-1 (Current, A, D), emblems, sheet row
- [x] Intro emblem, favicon, toys.json entry, Lab tile with GSAP hook
- [x] QA Q1 to Q10, docs/toys/sorting.md
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Defaults chosen (Tom's open questions: 3D or flat, and the presentation)

- Flat, face on. The toy compares heights; a 3D camera foreshortens the row and the eye loses the order. A black glass floor that mirrors the rods, and the haze, give the depth.
- Rods of glass lit from inside, coloured by height in a dusk ramp: deep indigo, violet, rose, warm gold. A shuffled row is a scatter of colour; a sorted row is one gradient.
- White is the flash: a compare lights two tips; a swap or move heats whole rods white, and they cool in about 0.2 s, so each algorithm leaves a wake of light. A pivot or a held key shows as a small cool light on the floor.
- Rods are objects: they glide on a swap, and Merge (in place) and Radix (LSD base 4) work by moves, so no rod ever copies.
- 48 rods; 32 on a stage under 640 px.
- First algorithm: Quick. The page opens a third of the way into a Quick sort, its wake warm, and the sort goes on after the intro.
- Speed slider: 3 to 1200 steps a second on a log scale, default 60.
- Sound: A major pentatonic, 21 notes from A2 to A6, so no step is a wrong note. A struck glass bar per note; soft tones for compares and reads, bright ones for swaps and moves; fast speeds cut each tone short with a fade, lower the level by the square root of the rate, and start four tones a frame at most. A limiter (ratio 20, 1 ms) before the kit's compressor. Sorted: the scale upward, then a soft A major chord.
- Drag across the rods to play them like a glockenspiel.
- Icon: no pick existed. Round sorting-1 (Current, A, D); A is on the menu. At rest the row is one swap from sorted and the out-of-order pair glints, so it does not read as a signal-strength glyph.

## QA (headless Chromium, --use-angle=gl, Tom's PC)

- Q1: node --check passes on the four modules and the menu scripts; toys.json parses.
- Q2, Q3: console clean on the toy (every key, chip, action, tap, strum) and on the menu with the tile hovered; captures at 1280 and 375 x 812.
- Q4: 0 rAF in 2 s after the row settles. Q5 hidden: 0. Q6 reduced motion: no auto start, 0 rAF idle; the sort runs on Space, rods jump.
- Q7: one choice, one slider, two actions (4 controls); How to play has 4 rows.
- Q8: 1 to 6 pick and start each algorithm; Space pauses and goes on; S shuffles.
- Q9: the context runs after a key and is suspended 5 s after the sweep ends.
- Q10: frame times during a Quick sort: median 16.7 ms, p95 16.8 ms.
- Sound level, headless recording of the output (17 s: Quick at 60 steps a second and its sweep, Insertion at 12, Radix at 650): peak 0.65, no sample above 0.98, no sample-to-sample jump above 0.25.
- Not checked: a real touch screen; the tones heard by ear.

## Notes for Tom

- Toy-owned files outside `sorting/`: `shared/emblems/sorting.svg`, `shared/favicons/sorting.png`, `tests/sorting-algos.test.mjs`.
