---
# stimming-kvkt
title: 'Beach walker: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:09:04Z
updated_at: 2026-11-09T17:14:09Z
parent: stimming-80dc
---

Move walker/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Time stepper, eight looks | Top left: choice `Time`, stepper (phone: bottom left) | The one choice group; the look persists |
| View chips Wide / Close (V) | Bottom left: action `Close`, key V, pressed state | Two states fit one chip; the view persists |
| Legs 8 / 12 (tray) | Settings: choice row `Legs`, persist | A set-and-forget tweak |
| Cycle the day (tray) | Settings: toggle `Cycle the day`, persist | A mode, not a verb |
| Reset (tray, R) | Settings footer: Reset; R stays | Shell rule |
| Quality (tray) | Settings: site Quality row | Site row |
| dl.how | Key strip: drag blow wind, drag the hub crank, arrows gust, V wide or close | Four entries |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No slider. No Clear.

## Checklist
- [x] Read brief, spec, Galaxy, Beach walker
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick walker in stimming-80dc

## Bugs fixed

- The walker froze for good after its first lull: the loop slept and nothing woke it. A timer now brings the breeze back.
- The arrow keys did not gust after a click on any chip. Now only text fields and sheets keep the arrows.
- Cycle the day jumped from a picked world to the day look; it now eases in. The Time stepper names the nearest hour while the day cycles.
- Cycle under reduced motion ran the loop every frame with no change; it no longer does.
- Reset did not wake the loop.
- Time, view, legs and cycle did not persist; all four now do.
- The feet sat above a measured v1 bar; they now keep 64 px over the bottom row.

## Diegetic proposal (awaits Tom)

A windsock on a post in the near sand, right of the sun. Drag its mouth: left or right sets the breeze direction, how high the sock flies sets its strength. Lulls still come. The sock replaces the Breeze slider the toy would otherwise need; it duplicates no control today. Keyboard path: up and down arrows raise and drop the breeze, on the key strip in place of V (V stays printed on the Close chip). Still: walker-diegetic-windsock.jpg in the batch notes folder.

## Summary of Changes

walker/index.html moves to Bar v2: one bar spec to initPage; the v1 header, bar, stepper, tray and dl.how and their CSS and JS are gone.
