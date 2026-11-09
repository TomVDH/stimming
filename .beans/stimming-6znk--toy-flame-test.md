---
# stimming-6znk
title: 'Toy: Flame test'
status: in-progress
type: feature
priority: normal
created_at: 2026-11-09T07:46:44Z
updated_at: 2026-11-09T08:13:25Z
---

Build Flame test from docs/plans/flametest.md. It starts in the Lab. Flick metal salts into a burner flame; the flame takes each salt's colour, and a prism fans that light into the salt's emission lines on a plate. Bar v2.

- [x] Plan: docs/plans/flametest.md
- [x] Task 1: flame, beam, prism, fan and plate; line tables (blockout)
- [x] Task 1: stills at 1280 and 375 px; checkpoint with Tom (signed off 2026-11-09)
- [x] Task 2: salt grains, flick, feed, blow, burn-off; air valve and soot
- [x] Task 3: loupe on the plate; the sodium doublet splits
- [x] Task 4: sound: gas roar, flick, crackle, the spectrum chord (Q9 passes)
- [x] Task 5: Settings, persistence, watchdog, idle; final checks
- [x] toys.json entry and menu Lab entry with an icon and a GSAP hook
- [ ] Tom sets the Dutch name
- [ ] Record the session cost

## Notes

- Blockout rulings: the wedge points down, so the fan rises to a plate at the upper right (landscape) or the top (portrait). This keeps the plate clear of the bottom bar and the key strip. The plan said a plate below; the plan is updated.
- The Prism map is half Cauchy, half even. Pure Cauchy crowded every salt into the right third of the plate.
- A mix burns in streaks: the top two salts share the mantle by noise. A mean colour went white.
- Already in the blockout: tap flicks, hold feeds, drag blows, the Air slider (soot below half), Shuffle, and the three Settings rows. Grains, loupe and sound wait for their tasks.
- Watch: the scene shader is heavy (two 48-line loops, four fbm calls). Compile took about 10 s in a hidden pane; measure on a real device in Task 5.
- Dutch name draft: Vlamproef (ˈvlɑmˌpruf). Tom sets it.

- Tasks 2 to 5 (2026-11-09): checked in the browser pane through a probe page (hidden pane). Q9 passes: the context runs after a click and suspends once the salt burns off. Settings rows, Reset and Escape work with a clean console. Not checked: fps and compile time on a real device, sound levels by ear.
