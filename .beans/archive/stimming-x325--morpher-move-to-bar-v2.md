---
# stimming-x325
title: 'Morpher: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T08:19:29Z
updated_at: 2026-11-09T08:23:38Z
parent: stimming-80dc
---

Move `morpher/index.html` to Bar v2. Brief: docs/plans/bar-v2-migration.md. `lab.html` stays.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Shape picker (12 forms, back/next pill) | Top left choice, stepper; first option Auto | More than five options. Phones: bottom left stepper. |
| Auto chip | Choice option `Auto` | Picker and Auto were two halves of one choice. |
| Blend slider | Bottom right main slider | The one continuous control. Phones: Settings. |
| Clear | Bottom left action, key C | Shared verb; disabled with no blobs. |
| Quality (v1 Settings tray) | Settings sheet, Site row | Shell standard. |
| `dl.how` (click, drag, drag the shape, C) | Key strip, four entries | Click drop, drag throw, drag the shape stretch, arrows + space aim. |
| Sound | Hidden (`silent`) | Morpher makes no sound. |

Visible controls: 3 of 5.

## Checklist

- [x] Play at 1280 and 375; note bugs
- [x] Map controls (this table)
- [x] Port to one bar spec; delete header, bar, picker CSS and JS
- [x] Fix bugs
- [x] Check in pane at 1280 and 375
- [x] Diegetic verdict with a still (proposal: shape seeds; waits on Tom)
- [x] Commit and push; tick morpher in stimming-80dc

## Summary of Changes

Ported to Bar v2: Shape stepper (Auto first, then twelve forms), Blend main slider, Clear (C), Quality in Settings, four-entry key strip, sound hidden. Removed header, bar, picker CSS and JS. Keys no longer trap Space and arrows while the stage is out of view; a page that cannot draw hides its controls. Diegetic proposal (shape seeds you fling into the morpher) waits on Tom.
