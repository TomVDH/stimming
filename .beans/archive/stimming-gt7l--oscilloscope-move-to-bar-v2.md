---
# stimming-gt7l
title: 'Oscilloscope: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T10:51:59Z
updated_at: 2026-11-09T10:57:53Z
parent: stimming-80dc
---

Move scope/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Pen, Knot chips | Top left: choice `Mode`, segments (phones: stepper bottom left) | One choice group, two options |
| Pitch slider and Hz readout | Bottom right: main slider `Pitch`, no number | The one continuous control; the screen already reads out Hz and the note |
| Shuffle, Clear | Bottom left: actions, keys S and C | Shared verbs |
| (none) | Settings footer: Reset | Returns to the cube, Pen, 110 Hz, P31, spin on; Clear shows, so Reset sits in Settings |
| (none) | Settings: site Quality row | The canvas follows fitCanvas, so Quality already applies |
| Spin tag, phosphor tag (on the screen) | Stay on the screen, moved clear of the corners | Already diegetic; Space and P |
| Sound-off tag (on the screen) | Stays on the screen, under the top-right cluster | Invites a tap; the shell sound button is the control |
| dl.how | `keys: false`; the screen's own legend carries keycaps | The spec lists Oscilloscope as a toy with its own legend |
| header data-shell | Shell: logo, name, sound, Settings | Shell |

## Checklist
- [x] Read brief, spec, Galaxy, Scope
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Keep the screen HUD and the face clear of the corners
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812 and 812 x 375
- [x] Diegetic proposal with one still
- [x] Commit, push, tick scope in stimming-80dc

## Diegetic check
Proposal, not built: a FREQ knob drawn on the screen right of the face replaces the Pitch slider, and a Pen/Knot toggle switch left of the face replaces the Mode segments. Drag turns the knob; the arrows keep their keys. On phones the knob keeps Pitch on the stage instead of in Settings. Still: `scope-diegetic-knobs.jpg` in the batch notes folder. Waits for Tom.

## Summary of Changes
Scope passes one bar spec to initPage. Mode segments top left (stepper bottom left on phones). Pitch is the main slider, bottom right (Settings on phones); the screen keeps the Hz and note readout. Shuffle and Clear bottom left on S and C. Reset and site Quality in Settings. `keys: false`: the screen legend now carries keycaps (Space on the spin tag, P on the phosphor tag, the arrows by the note) on mouse screens.
The screen HUD and the face measure the shell corners and sit clear of them; a corner refit moves the face without rebuilding the targets.
Fixed: the canvas ignored a new Quality choice until a resize. P and Space fired inside the Settings sheet. The arrows, Space and P had no on-screen hint once dl.how went. Clear now disables on an empty face. The phosphor choice is remembered in `stimming.scope.phosphor`. A browser without WebGL 2 hides the controls.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset, coarse) and 812 x 375 (fine pointer; the pane emulates touch only below 768 px). No corner overlaps another; no control leaves the stage; no page scroll. The Settings sheet fits at 375. The readouts, tags, hint, knot numbers and face all sit clear of the corners. Console clean.
