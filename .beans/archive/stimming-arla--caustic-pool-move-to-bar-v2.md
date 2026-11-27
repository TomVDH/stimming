---
# stimming-arla
title: 'Caustic pool: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T11:09:29Z
updated_at: 2026-11-09T11:15:50Z
parent: stimming-80dc
---

Move pool/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. legacy.html (Classic) stays on v1.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Tool picker pill (Ball, Anvil, Kettlebell, Cut) | Top left: choice `Tool`, segments with icons; keys 1, 2, 3, X | Four options; the one choice group |
| Clear chip | Bottom left: action `Clear`, key C | Shared verb |
| Rain (R key only, no control) | Bottom left: action `Rain`, key R, pressed while it rains | Touch had no path to rain |
| Settings tray: Pool (Lap, Round, Bean) | Settings: choice row `Pool`, persist; key P | Rare change, rebuilds the pool |
| Settings tray: Time (Day, Night) | Settings: choice row `Time`, persist; key N | Rare change; diegetic candidate |
| Settings tray: Quality | Settings: site Quality row | Site row |
| dl.how | Key strip: click drop, drag throw or cut, drag the deck turn, space toss one in | Four entries |
| header data-shell, Classic link | Shell: logo, name, sound, (i); Classic under Build in Settings | `legacy: true` |

Five visible at most: choice, Clear, Rain. No slider. No Reset: Clear empties the water.

## Checklist
- [x] Read brief, spec, Galaxy, Caustic pool
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick pool in stimming-80dc

## Bugs found in play
- Rain has no control on touch: only the R key turns it on.
- The v1 Settings tray opens on hover.
- Portrait phones show the Bean and Round pools small in a wide lawn.

## Diegetic proposal (awaits Tom)

A pool-lamp switch: a steel toggle plate on the deck. A tap flips the lamps and the time, day to night. It replaces the Time row in Settings; N stays as the keyboard path. Still: `pool-diegetic-lamp-switch.jpg` in the batch notes folder.

## Summary of Changes

Caustic pool passes one bar spec to initPage. Tool (Ball, Anvil, Kettlebell, Cut) is the top-left choice with stencil icons and keys 1, 2, 3, X. Clear (C) and Rain (R) sit bottom left; Rain stays pressed while it rains. Settings holds Pool and Time (persisted under the old keys) and the site Quality row; Classic sits under Build. Key strip: click drop, drag throw or cut, drag the deck turn, space toss one in.
Fixed: rain had no touch control; the Settings tray opened on hover; the Bean pool sat small on portrait phones (a tall stage now views it from the side); P, N and Space no longer fire from inside the Settings sheet; the intro fallback dropped its stale number line.
Shell bug sent to the orchestrator: the logo and the toy name lose contrast on the pale sandstone deck (Round, Day).

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip, no control leaves the stage, no sideways scroll, the Settings sheet fits, touch targets are 34 px or more. Console clean. Reload keeps Pool and Time.
