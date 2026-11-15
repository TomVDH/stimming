---
# stimming-q6zb
title: 'Spark wheel: menu icon and intro emblem'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T06:58:02Z
updated_at: 2026-11-15T08:34:59Z
---

Tom (2026-11-14): "lets get an icon going too". The menu icon is still the old flat wheel; the toy now has a holed roller on a fork, eight spark types and a rim that heats.

- [x] Icon spike 1: four directions with emblems (icons/spike-spark-1.html)
- [ ] Tom picks a direction
- [ ] Install the pick on the menu (index.html, the toy's enter/move/leave hook)
- [ ] Emblem to shared, toys.json emblem, icons/picks.json note

## Notes

- 2026-11-14, spike 1. A: on its mount (three-quarter view, cold at rest). B: close on the flint. C: face on. D: the hot wheel (glows at rest; each flare changes the spark type). In all four a pointer sweep flicks the wheel, spin throws sparks and heats the rim, a full heat flares. Checked in the pane: no error, sparks and flare seen at 256, 128 and 64, no DOM change once at rest.

- 2026-11-15: Tom could not see the intro logos. The app's file view opens the page as a data: document, so the emblem files did not resolve. The spike page now carries each emblem inside the page; the files stay for the install.

- 2026-11-15, Tom: round 1 was off the house styles ("we had a sprawl of good icons across 4 diff styles, abide by that"). Then the standard: Isometric block is the one alt style; a toy has Current, Shaded object and Isometric block. No new icons until the sheet is ready.
  - icons/sheet.html is renewed: one row per toy in toys.json order, Current, Shaded object, Isometric block; Icon, Intro logo or Both; a click marks a tile; empty slots say To draw or Cut. 88 toys, 20 shaded, 27 isometric.
  - The standard is in AGENTS.md (Icon standard); icons/picks.json iterates A and D.
  - icons/spike-spark-2.html holds Spark wheel's Current, A (Shaded object) and D (Isometric block), drawn before the stop. Not iterated, not installed. Round 1 (spike-spark-1) stays as a file, off the sheet.
  - Next: Tom looks at the sheet and marks what to draw or redo.

- 2026-11-15, Tom: "ensure that all remain interactive when moused over". The sheet's Current column was a still copy; it is now the menu's own tiles in a frame laid over the column, so every icon on the sheet reacts. A click on a Current tile marks it and does not open the toy.

- 2026-11-15, Tom: "show me icon choices". Round 3 (icons/spike-spark-3.html) redraws the Shaded object and the Isometric block in the approved look: swept turquoise body, cream roller with five swept slots, brass column and cap, knurled steel rim. The sheet now points Spark wheel at round 3. Both react under the pointer and go idle after; no error. Round 2 stays as a file (the old steel look). Waits on Tom's pick.

- 2026-11-15, Tom on round 3: "they are all really bad, take a look at the toy icons that most of the main menu has". Round 3 was a small detailed model of the toy. Round 4 (icons/spike-spark-4.html) is drawn in the menu's language: one bold cream wheel with five swept slots and a ring of knurl ticks, a turquoise sweep, a brass flint, sparks as five flat rays. The Isometric block is the same wheel on a turquoise block. Under the pointer the wheel turns, the rays grow and the knurl heats. The sheet points at round 4; the rule is in AGENTS.md. Waits on Tom.

- 2026-11-15, Tom on round 4: "it's just too busy; our main menu has a much more focused direction". Round 5 (icons/spike-spark-5.html) is one object and one accent: a knurled steel wheel with a plain cream face and a brass hub, and one spark of three flat rays off its rim. No body, no flint, no slots. The Isometric block is that wheel on a turquoise block with the same spark. Under the pointer the knurl runs, the rays grow and the rim heats. The sheet points at round 5. Waits on Tom.
