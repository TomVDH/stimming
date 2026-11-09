---
# stimming-gwzz
title: 'Balloon letters: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:10:41Z
updated_at: 2026-11-09T17:25:23Z
parent: stimming-80dc
---

Move balloons/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc. No legacy.html.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Foil chips (Gold, Silver, Rose, Holo) | Top left: choice `Foil`, segments with foil dots; no keys | Four options; letter and digit keys must stay free for typing |
| Enter (key only; touch Go key) | Bottom left: action `Let go`; Enter stays the toy's own key | Touch had no visible way to let go; a shell Enter would fire on focused buttons |
| Tap bare stage opens the touch keyboard (hidden) | Bottom left, touch only: action `Type` opens the keyboard | Touch typing had no visible path |
| Backspace pricks the last letter | Key strip and keyboard only | Hold pricks on touch |
| Settings tray: Quality | Settings: site Quality row | Site row |
| (none) | Settings footer: Reset, back to HI | Spec verb; an empty stage gets HI back |
| dl.how | Key strip: type inflate, drag bat it, hold prick, enter let go | Four entries; touch shows drag and hold |
| header data-shell | Shell: logo, name, sound, (i) | No legacy build |

Visible: choice, Let go (and Type on touch). No slider.
No shell shortcut keys at all: every printable key belongs to typing.

## Checklist
- [x] Read brief, spec, Galaxy, Balloon letters
- [x] Play v1 at 1280 (pane hidden: motion judged from code)
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812, 812 x 375 and 740 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick balloons in stimming-80dc

## Bugs found in play
- Touch has no visible way to type or to let go.
- Keys typed while focus sits in Settings inflate letters.
- Three and four row words reach the top edge, under the new top corners.
- Portrait phones allow four rows at most, so long words shrink to tiny letters.
- A word typed right after Let go is shoved to the ceiling by the rising released letters.

## Diegetic proposal (awaits Tom)

A helium tank stands on the floor, right of centre. A tap on the tank puts up the touch keyboard, and each new letter puffs out of its nozzle. It replaces the touch-only Type chip; typing stays the keyboard path. Alternative: a bouquet weight that holds every ribbon; a tap cuts them loose and replaces Let go (Enter stays). Still: `balloons-diegetic-helium-tank.jpg` in the batch notes folder.

## Summary of Changes

Balloon letters passes one bar spec to initPage. Foil (Gold, Silver, Rose, Holo, with foil dots) is the top-left choice and comes back on the next visit. Let go sits bottom left and greys out with no word up; touch screens add Type, which opens the keyboard. Settings holds the site Quality row and Reset (back to HI). Key strip: type inflate, drag bat it, hold prick, enter let go. The bar binds no shortcut keys, so every printable key still types.
Fixed: touch had no visible way to type or let go; keys typed in Settings inflated letters; the word now keeps 24 px clear of the corner rows and sinks before it shrinks; tall stages stack up to seven rows (long words on a phone are about twice as big) and prefer whole words; released letters no longer shove the next word into the ceiling. HI at 1280 keeps its approved size and height.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset), 812 x 375 and 740 x 375 (touch). No corner overlaps another or the key strip, no control leaves the stage, no sideways scroll, the Settings sheet fits, touch targets are 34 px or more, Escape closes the sheet and returns focus. Console clean. Motion judged in a throwaway timer-driven probe because the pane was hidden.
