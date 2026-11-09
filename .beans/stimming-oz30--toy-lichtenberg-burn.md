---
# stimming-oz30
title: 'Toy: Lichtenberg burn'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:47:54Z
updated_at: 2026-11-09T08:55:46Z
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
- [x] Task 5: Settings, frame loop, watchdog; Q1 to Q10
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [x] Visual overhaul (Tom, 2026-11-09): painted panel, violet spark, extras
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

- Task 5: Settings Branching (eta 3 to 1.6), Ember life (glow tau 1.5 to 6 s, smoulder 8 to 36 s), Glow (bloom 0 to 1.5); all persist. Glints ease out over the 2 s before sleep. Watchdog ladder: pixel ratio, then bloom one level smaller, then 2500 cells and 16 steps a frame; it never writes stimming.quality. The shader-compile poll is capped at 3 s; in a hidden pane it stalled boot.
- QA in a probe page (hidden pane): Q1 syntax ok (page and menu). Q2 console clean after hold, tap, Space, C, both chips, all Settings rows. Q4 drifting 12 fps, asleep 0 frames 61 s after input. Q5 by code review only (the probe forces visibility). Q6 reduced motion not emulated in the pane; code path checked. Q7 three controls, four key rows (three on touch). Q8 Space burns and freezes, C clears. Q9 context runs after the gesture, suspends once cooled. Q10 CPU about 0.2 ms a frame for the growth step in the probe; real-device fps unmeasured.
- 375 px: stepper bottom left, Clear bottom right, Voltage in Settings, 34 px targets, no overlaps.
- Session cost: no dollar figure available in this session; left open for Tom.

- Menu icon: interactive. A spark tree grows where the pointer enters, reaches for the pointer as it moves, and cools to orange then fades on leave. Lab icons get only play and rest, so the icon adds its own pointer listeners.

- Visual overhaul (Tom's picks): electric violet spark, painted teal panel, flying sparks, smoke wisps, char groove, ember flicker. Grid 2.5 px, 10,000 cells a burn, 60 steps a frame. The char texture keeps mips; a blurred level gives the blister reach. Live strokes stamp recent segments each frame and the whole tree every 0.25 s. Glints sum neighbour patches, so no square clips. Acrylic: four fracture depths, red and blue fringe, pointer tilt. QA headless (M4): console clean, 88 fps during a burn, one 70 ms hitch, 1280 and 375 px. Real-phone fps, reduced motion, 812 x 375 and tests/bar-v2.html unchecked.
