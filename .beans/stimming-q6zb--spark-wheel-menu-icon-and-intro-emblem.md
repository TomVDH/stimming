---
# stimming-q6zb
title: 'Spark wheel: menu icon and intro emblem'
status: in-progress
type: task
priority: normal
created_at: 2026-11-15T06:58:02Z
updated_at: 2026-11-15T08:52:50Z
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

- 2026-11-15, Tom on round 5: "redo shaded object ... fidelity??". Round 5 was focused but flat. Round 6 (icons/spike-spark-6.html) redraws only the Shaded object, as the Heat putty icon is built: one solid wheel in three-quarter view, a knurled tread with chrome bands and an embossed knurl, a dished cream enamel face, a brass hub dome with a soft shadow, and one glowing spark (a white core, four gradient needles, warm light on the wheel and the floor). Under the pointer the knurl runs, the tread heats to gold and the spark grows. The Isometric block is round 5's. The sheet points at round 6. Waits on Tom.

- 2026-11-15, Tom on round 6: "better but just not at the interactive fidelity of the other icons on main menu". Round 7 (icons/spike-spark-7.html) keeps round 6's drawing and rebuilds the Shaded object's behaviour: the pointer is the thumb. A downward stroke turns the knurl one for one; an upward stroke does nothing (the ratchet); the wheel spins on and slows. Spin throws live sparks that fly, fall and skip on the floor, and lights the contact glow; a long grind heats the tread and sheds in a burst. The enamel's gloss and the hub's shine lean toward the pointer. Keyboard focus strokes it by itself. Checked by script in a background tab (no error, settles); motion there is throttled, so not judged by eye.

- 2026-11-15, Tom on round 7: "its not good"; he named Pin art as the icon to match. Round 8 (icons/spike-spark-8.html) draws the Shaded object in Pin art's language: glossy beads only, one gradient each, a thin frame ring. A ring of 30 steel studs is the knurled wheel, with a hub bead; a fan of warm beads is the spark. Studs near the pointer swell and sink back, as Pin art's pins do. Moving the pointer round the ring turns it; each stud that passes the contact point throws a bead and flares the spray. Focus turns it a third of a turn. Gesture only, no per-frame loop. The Isometric block is round 5's. The sheet points at round 8. Waits on Tom.

- 2026-11-15, Tom: "Yes, keep going" on round 8. Round 9 (icons/spike-spark-9.html) adds the Isometric block in the same language, after Pin art's block: a flat-shaded slab (teal sides, slate top), the bead wheel standing on it in the left face's plane, a spray of warm beads lying on the top. Studs swell under the pointer; a sideways sweep turns the wheel and each passing stud skids a bead out along the top, where it cools. The Shaded object is round 8's. The sheet points at round 9. Waits on Tom's pick.

- 2026-11-15, Tom: "you took pin art so literal; check wind map, galaxy, sonar: all unique and nice". Rounds 8 and 9 copied Pin art's beads. Round 10 (icons/spike-spark-10.html) draws the toy's signature image as a live miniature, after Wind map: a porthole on the teal room, the cream slotted wheel at the left, a long-exposure fountain of 70 sparks (each a real flight with drag, gravity and a floor skid, tapering white to ember), small stars where sparks fork, the spray mirrored in the wet floor. On hover comets run along every flight; the spray turns toward the pointer and grinds harder the farther it is; a quick stroke spins the wheel. It returns to the picture and stops on leave. The Isometric block is round 9's. The sheet points at round 10.
