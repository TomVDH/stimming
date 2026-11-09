---
# stimming-qj4w
title: 'Heat putty: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:11:12Z
updated_at: 2026-11-09T17:15:13Z
parent: stimming-80dc
---

Move putty/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. legacy.html (Classic) stays on v1.

## Play notes (v1, 1024 and 375)

- The slab sizes itself from the `.bar` rows; v2 corners lie over the stage, so the slab must clear the corner rows instead.
- The stage has `tabindex` and `role="application"` but no key does anything: Clear and the putty chips have no key.
- The putty choice is not remembered over a reload.
- No WebGL 2: the page throws and leaves the bar live over an empty stage.
- On a phone the v1 bar takes two rows under the slab.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Violet, Teal, Noir chips | Top left: choice `Putty`, three segments with a colour dot, keys 1 to 3 (phones: stepper bottom left) | One choice group; the dot shows the cold dye |
| Clear | Bottom left: action `Clear`, key C | Shared verb; kneads a fresh, cold slab |
| Quality row (qualitySetting) | Settings: site Quality row | Shell owns it |
| Classic link (header) | Settings, Build row, via `legacy: true` | Shell owns it |
| dl.how (Drag smear, Hold print) | Key strip: drag smear, hold handprint, 1 2 3 putty, C clear | Four entries |
| header data-shell | Shell: logo, name, sound, Settings, (i) | Shell |

No slider: no continuous value earns one. No Reset: Clear is the reset.

## Checklist
- [x] Read brief, spec, Galaxy, Soap cutting
- [x] Play v1 at 1024 and 375
- [x] Diegetic verdict and one still
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check 1280, 375 x 812, 812 x 375, 740 x 375 touch
- [x] Commit and push; tick stimming-80dc

## Diegetic proposal

A putty knife docks on the slab right edge; drag it across to scrape the slab flat and cold. It would replace the Clear chip; C runs the same sweep. Still: side-session notes, `putty-diegetic-scraper.jpg`. Build only on Tom yes.

## Summary of Changes

- One `bar` spec: Putty choice (three segments, duotone dots, keys 1 to 3; stepper on phones), Clear (key C), Quality and the Classic link in Settings, a four-entry key strip.
- The slab clears the corner rows, measured from the shell layer.
- The putty choice persists in `stimming.putty.putty`.
- Clear is disabled on a fresh slab.
- No WebGL 2 hides the controls.
- Header, `.bar`, `dl.how`, `choices()` and `qualitySetting()` wiring removed.
