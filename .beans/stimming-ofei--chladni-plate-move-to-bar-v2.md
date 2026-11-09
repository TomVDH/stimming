---
# stimming-ofei
title: 'Chladni plate: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T11:10:01Z
updated_at: 2026-11-09T11:15:38Z
parent: stimming-80dc
---

Move chladni/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Shuffle chip | Bottom left: action `shuffle`, key S | Shared verb |
| Reset chip (spreads the sand again) | Bottom left: action `reset`, key Space | No Clear shows, so Reset stays on the stage |
| The rail (pitch cap, a notch per pattern, Hz and pattern readout) | Stays on the stage, in a lane between the top-right cluster and the stage foot | The toy's own tuning instrument; it already sits in the scene. No main slider, so nothing duplicates it |
| (none) | Settings: site Quality row | The canvas now follows the site pixel ratio |
| Enter (toss), arrows (step pattern) | Toy keys, unchanged; arrows in the key strip | Keyboard paths for toss and tune |
| dl.how | Key strip: drag tune, click toss sand, drag rail ring, arrows next pattern | Four entries |
| header data-shell | Shell: logo, name, sound, Settings, (i) | Shell |

Visible controls: two actions. The rail is the toy's own UI, not a shell control.

## Checklist
- [x] Read brief, spec, Galaxy, Chladni
- [x] Play v1 at 1280 and 375
- [x] Map controls
- [x] Diegetic proposal with one still
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375, 740 x 375 touch
- [x] Commit, push, tick chladni in stimming-80dc

## Diegetic check
Proposal, not built: a small signal generator stands on the floor right of the plate, in the rail lane. A knurled gold FREQ dial with a detent per pattern replaces the rail; a glowing readout shows Hz and the pattern; a cable runs to the stand. Drag round the dial to tune; the arrows keep their keys. Alternative: a bow drawn along the plate front edge, where bow speed drives the plate. Still: `chladni-diegetic-signal-generator.jpg` in the batch notes folder. Waits for Tom.

## Summary of Changes
Chladni passes one bar spec to initPage. Shuffle (S) and Reset (Space, pours fresh sand) sit bottom left. Site Quality sits in Settings. The key strip shows drag tune, click toss sand, drag rail ring, arrows next pattern. The rail stays on the stage: it measures the shell corners and the key strip, runs from under the top-right cluster to above the stage foot, and its readout uses the slab face. The plate fits clear of every corner and refits when the shell refits.
Fixed: the canvas ignored the site Quality (it now follows pixelRatio; a new choice clears the slow-frame step). Arrow keys inside the Settings sheet also stepped the plate. The rail slider had no aria-valuemin or aria-valuemax. A browser without WebGL 2 now hides the rail and disables both actions.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset, coarse), 812 x 375 (fine) and 740 x 375 (coarse). No corner overlaps another or the rail; no control leaves the stage; no sideways scroll. Chips are 36 px on coarse pointers; the rail is 44 px wide. The Settings sheet fits; Escape closes it and returns focus. Console clean. The key strip lies over the plate front edge until it fades, as on other toys.
