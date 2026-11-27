---
# stimming-gg7y
title: 'Coil: Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T17:36:36Z
updated_at: 2026-11-09T17:45:32Z
parent: stimming-80dc
---

Move Coil (`coil/index.html`) to Bar v2. Plan: `docs/plans/bar-v2-migration.md`. Epic: `stimming-80dc`.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| `header[data-shell]` (logo, back, sound) | Top left logo and `/ COIL` name; top right Sound, Settings, (i) | Shell owns them. |
| Nudge chip (Space) | Bottom left action `Nudge`, key Space | The toy's main verb. The shell binds Space. |
| Reset chip (R) | Bottom left action `Reset`, key R | No Clear, so Reset stays visible. |
| Quality tray (`qualitySetting()`) | Settings, Site row (`quality: true`) | Shell row. |
| `dl.how` (drag an end, drop over the edge, Space, R) | Key strip: drag an end / stretch, drag over the edge / walk, ↑ / pluck | Space and R show on their chips. ↑ was hidden; it now shows. |
| ↑ pluck (stage focus only) | Key ↑ anywhere outside a field or sheet | No choice uses the arrows. |

Visible controls: 2 of 5.

## Checklist

- [x] Read plan, spec, Coil, reference ports
- [x] Play v1 at 1280 and 375
- [x] Map controls
- [x] Diegetic check, proposal still
- [x] Port to one `bar` spec; delete header, bar, how, qualitySetting
- [x] Frame the stairs clear of the corners and the key strip
- [x] Fix bugs and upgrade
- [x] Check 1280, 375 x 812, 812 x 375, 740 x 375 touch
- [x] Commit and push; tick coil in `stimming-80dc`

## Notes

- First-tap stall: not reproduced in the pane. The first gesture's audio path costs 2.5 ms; the second 0.8 ms.

- Diegetic proposal (unbuilt, awaits Tom): tap the coil body to tip it over the edge; it replaces the Nudge chip; Space stays. Still: `coil-diegetic-tap.jpg` in the shared notes.

## Summary of Changes

- Bar v2: Nudge (Space) and Reset (R) bottom left; Quality in Settings; key strip with drag words and the up arrow.
- The camera frames the stairs and the stretch room between the corner rows, with a view offset.
- The top step now runs out of view at every aspect; it ended in view on short stages.
- The up arrow plucks from anywhere on the stage, not only with stage focus; below the stage it scrolls.
- The key strip names a touch word for the walk, so phones show it.
- Sound runs on the shared audio kit; the graph and levels stay the same.
- Checked at 1280 x 800, 375 x 812, 812 x 375 and 740 x 375 touch: no overlaps, 34 px targets, no sideways scroll, clean console.
