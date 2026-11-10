---
# stimming-80dc
title: 'Bar v2 migration: every toy'
status: in-progress
type: epic
priority: normal
created_at: 2026-11-09T08:16:14Z
updated_at: 2026-11-09T17:45:32Z
---

Move every toy's index.html to Bar v2, five at a time. Follows stimming-tbpn. Brief: docs/plans/bar-v2-migration.md. Spec: docs/plans/bar-v2.md.

## Batch 1
- [x] pop
- [x] prism
- [x] pins
- [x] fidget
- [x] morpher

## Batch 2
- [x] domino
- [x] eyes
- [x] fire
- [x] glass
- [x] rain

## Batch 3
- [x] bubbles
- [x] kaleido
- [x] ferro
- [x] neon
- [x] scope

## Batch 4
- [x] magnet
- [x] soap
- [x] chladni
- [x] pendulum
- [x] pool

## Batch 5
- [x] putty
- [x] walker
- [x] balloons
- [x] lava
- [x] tvtree

## Batch 6
- [x] coil
- [ ] cube
- [x] dandelion
- [ ] flap
- [ ] flock

## Batch 7
- [ ] frost
- [ ] gears
- [ ] harmono
- [ ] harp
- [ ] marble

## Batch 8
- [ ] musicbox
- [ ] orbits
- [ ] plasma
- [ ] sand
- [ ] slime

## Batch 9
- [ ] snow
- [ ] tesseract
- [ ] top
- [ ] zipper
- [x] trails

## Batch 10
- [x] chamber
- [x] shadyos (Drag Smear/Jelly top left, keys 1 and 2; + Window, Error, Clear bottom left; Age slider bottom right; Haunt and Quality in Settings; keys off)
- [ ] glow
- [ ] foil
- [ ] sequin

## Batch 11
- [ ] oilslick
- [x] ink
- [x] sonar (Display Active/Listen top left; Ping and Shuffle bottom left; Range/Span slider bottom right; Afterglow, Scanlines, Grid, Quality in Settings; keys off)
- [ ] subway
- [ ] trainride

## Batch 12
- [x] fireworks
- [ ] windfarm
- [ ] window
- [ ] viaduct
- [ ] sunbeam

## Star trails map

| v1 control | v2 slot | Why |
|---|---|---|
| Sky (North, South, Equator) | Choice, top left, keys 1 to 3 | The one scene pick. |
| Exposure slider | Main slider, bottom right | The toy's main dial. |
| Hold the stage, Space | Shutter, held action, Space | A visible keyboard path for the shutter. |
| Clear | Clear, key C | Empties the plate. |
| Stars, Colour, Meteors | Settings, persisted | Tweaks; same storage keys as v1. |
| Quality | Settings, Site | Shell row. |

## ShadyOS map

| v1 control | v2 slot | Why |
|---|---|---|
| Drag (Smear, Jelly) | Choice, top left, keys 1 and 2 | The one way to play the drag. |
| Age slider | Main slider, bottom right | The toy's main dial; same storage key as v1. |
| + Window, Error, Clear | Actions, bottom left, keys N, Space, C | Three verbs; Space kept its v1 meaning. |
| Haunt (stored, no control in v1) | Settings toggle, persisted | A visitor can now switch the 3:33 haunt off. |
| Quality | Settings, Site | Shell row. |
| How-to list | Off (`keys: false`); the stage label carries it | The shelf sits where the key strip would. |

The desktop lays out from the shell corners: the menu strip grows to hold the top row, the clock sits left of the top-right cluster, and the shelf and the watermark lift clear of the bottom row.
