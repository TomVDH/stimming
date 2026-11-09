---
# stimming-94pk
title: 'Fire: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:10:12Z
updated_at: 2026-11-09T09:15:42Z
parent: stimming-80dc
---

Move `fire/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md. Epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Header (mark, back, sound) | Top left logo and name; top right sound | Shell standard |
| Fuel tray (12 chemicals, colour dots) | Top left choice, stepper with colour dots | More than five options; a look choice. Phones: bottom-left stepper |
| Intensity slider | Bottom right main slider | The one main dial |
| Reset | Bottom left action, `reset` verb | No Clear, so Reset shows. No key: letters burn a word |
| Settings tray: Motion | Settings row, choice, persisted | Four options |
| Settings tray: Temperature, Turbulence | Settings rows, sliders, persisted | Same keys as v1 |
| Settings tray: Quality (Low, Medium, Standard, High) | Settings toy row Quality, four options | Low and Medium are Fire's own steps; Standard and High set the site choice. One row, not two |
| How-to: drag fire, drag air, click, type | Key strip, four entries | Same four |

Visible controls: 3 of 5.

## Checklist

- [x] Map controls (this table)
- [x] Diegetic check: none fits
- [x] Port to one bar spec; delete dead markup and wiring
- [x] Fix bugs found on the way
- [x] Check in the pane at 1280 px and 375 px
- [x] Commit and push; tick fire in stimming-80dc

## Bugs found (v1)

- The controls show the defaults (Wood, 0.6) until the GPU compile ends (15 s at 375 px), and do nothing until then.
- Escape that closes a tray also clears the burning word; typing in a tray burns letters.

## Diegetic check

None fits. A pinch of chemical thrown in the flame would clone Flame test. A bellows would repeat drag-the-air, which already blows.

## Summary of Changes

One bar spec replaces the header, the bar, the Fuel and Settings trays and their popover wiring. Fuel is a stepper with colour dots. Quality stays one row with four steps: Low and Medium are Fire own steps, Standard and High set the site choice. Stored keys are the same as v1.

Bugs fixed: the controls show the stored values at once and work during the GPU compile; Reset is disabled until the sim is ready. Escape that closes a sheet keeps the word; keys in a sheet no longer burn letters. Reduced motion: a slider redraws its still once the drag rests. Without WebGPU only the logo and the name stay.
