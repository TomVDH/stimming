---
# stimming-oz30
title: 'Toy: Lichtenberg burn'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:47:54Z
updated_at: 2026-11-09T08:46:06Z
parent: stimming-oh7b
---

Build Lichtenberg burn from docs/plans/lichtenberg.md. It starts in the Lab. Press and hold: a blue-white DBM tree crawls from the finger, burns into a birch board and cools to embers. Raw WebGL2, Bar v2.

- [x] Plan: docs/plans/lichtenberg.md
- [x] Task 1: grid, DBM growth, strokes, char, heat, emission, bloom, wood (blockout)
- [x] Task 1: hold, release, tap; Bar v2 shell; three seeded burns
- [x] Task 1: syntax, console, stills at 1280 and 375 px; checkpoint with Tom (signed off 2026-11-09)
- [x] Task 2: branch flash, embers, board light, arc-over, Clear sweep
- [x] Task 3: acrylic block
- [x] Task 4: sound: buzz, crackle, snap, sizzle; Q9
- [ ] Task 5: Settings, frame loop, watchdog; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Task 1 rulings: commits go to main through tools/commit.sh (shared checkout). Arc-over (stop plus path flash) and old-char attraction landed early, in the blockout; their polish stays in Task 2.
- Portrait stages get two seeded burns, not three; the phone board is too small for three.
- Stills were taken from a throwaway probe page (hidden pane), canvas only.
- Dutch name draft: Bliksemhout (ˈblɪksəmˌɦʌut). Tom sets it.

- Task 2: the spark core clips at 1.5 so the halo carries blue into the bloom. Glints are pinpoints, one candidate per 3-cell patch. Arc-over re-heats the touched tree and flashes it as a thin line; the board flashes blue. Clear sands left to right over 0.7 s.

- Task 3: Acrylic is a dark block lit by a violet-blue LED from the left edge; light falls off with the square of the edge term, since the tone map flattens a gentler ramp. Fractures glow with sparkles and a faint deeper plane; heat shows as a cold blue afterglow. The chip eases between boards over 0.6 s.

- Task 4: raw Web Audio on the kit, no Tone. Buzz (100 Hz saw plus 300 Hz, wobbling bandpass) pans with the tip; about one step in three cracks, every new branch cracks louder. Arc-over snaps (crack, falling thump, tail). Hot wood sizzles and ticks as it cools (tau 5 s). Q9 checked in a probe: the context runs after the gesture and suspends about 20 s after release, once the wood cools; a later press wakes it. Not heard by ear.
