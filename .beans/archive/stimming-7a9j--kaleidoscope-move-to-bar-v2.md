---
# stimming-7a9j
title: 'Kaleidoscope: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T10:52:13Z
updated_at: 2026-11-09T11:02:50Z
parent: stimming-80dc
---

Move kaleido/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| 6, 12 chips | Top left: choice `Mirrors`, segments `6 · 12 · Tri` (phones: stepper bottom left) | One choice group, three options |
| Settings tray: Mirrors Two / Tri (opened on hover) | Joins the choice as `Tri` | v1 hid it to keep the bar short; v2 has room, and Tri is the biggest look |
| Shuffle (die) | Bottom left: action `shuffle`, key S | Shared verb |
| (none) | Settings: site Quality row | High renders at the screen's ratio |
| dl.how | Key strip: drag turn, swipe spin, space shake, arrows turn | Four entries; touch shows drag and swipe |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No slider, no Reset: nothing to clear.

## Bugs and rough edges (v1 play, 1280 and 375)
- The view zooms in too far: one wedge shows two or three pieces, ink nuts read as big black blobs (AGENTS.md open item).
- Settings opened on hover; the Tri row hid the toy's biggest look.
- Under Tri the 6 / 12 chips sat dim but focusable.
- The slow-frame step ignored site Quality.

## Checklist
- [x] Read brief, spec, Galaxy, Kaleidoscope
- [x] Play v1 at 1280 and 375
- [x] Diegetic verdict and still
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix the zoom and the bugs above
- [x] Check at 1280, 375 x 812 and 812 x 375
- [x] Commit, push, tick kaleido in stimming-80dc

## Diegetic check
Proposed, not built: a mirror collar. A knurled ring at the disc rim carries three marks, 6, 12 and Tri, under a lime index at the top. Drag the ring to turn it; it clicks into the nearest mark and the mirrors cross-fade. Key M steps it. It replaces the Mirrors choice. Still: side-session notes, kaleido-diegetic-collar.jpg. Build only on Tom's yes.

## Summary of Changes
Kaleidoscope passes one bar spec to initPage. Mirrors 6, 12 and Tri are one segment group top left (stepper bottom left on phones). Shuffle (S) sits bottom left. Settings holds the site Quality row. Key strip: drag, swipe, space, arrows; touch shows drag and swipe.
Zoom fixed: every piece shrinks to 0.64 of its old size, and counts grow to 225 so each layer still fills half the drum. Clink pitch and glints scale with it.
Fixed: Tri hid in a hover tray; the page ignored site Quality; the slow-frame step now falls back to Standard on High; page keys skip the Settings sheet.

## Mobile and compliance (80559e3)
Checked at 1280 x 800, 375 x 812 (mobile preset) and 812 x 375. No corner overlaps another or the key strip; no control leaves the stage; no sideways scroll; the Settings sheet fits; chips are 36 px on touch. At 375 the shell drops the name. The canvas draws no UI. Escape closes the sheet and returns focus. Console clean.
Cost: 225 pieces take about 1.5 ms per physics step and 10 ms per cell redraw on this Mac; slow frames step the cell down.
