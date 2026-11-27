---
# stimming-u4us
title: 'Fireworks: Bar v2 port'
status: completed
type: task
created_at: 2026-11-09T21:46:01Z
updated_at: 2026-11-09T21:46:01Z
parent: stimming-80dc
---

Tom (2026-11-09): Bar v2 for Fireworks. Brief: docs/plans/bar-v2-migration.md. Spec: docs/plans/bar-v2.md.

## Map

| v1 control | v2 slot | Why |
|---|---|---|
| Shell stepper with its grid of drawings | Top left: choice, `tray` with the shell drawings as icons | 25 shells with icons: the tray is their grid |
| Distance slider | Bottom right: main slider | The one continuous control people reach for |
| Showtime | Bottom left: action, key S | The one verb |
| Smoke Thin/Thick | Settings: choice | Look tweak |
| Scene Bay/Island/City | Settings: choice; a pick reloads, as before | Rare, heavy change |
| Sky Drift/Clear/Cloud | Settings: choice | Look tweak |
| Water Calm/Ripple | Settings: choice | Look tweak |
| Bill Off/On | Settings: choice (Off/On, the toy's own stored values) | Gag, off by default |
| Quality | Settings: site row (`quality: true`) | Shell row |
| dl.how | Key strip: click launch, hold bigger shell, Space a random shell, arrows step the shell | Four entries |

Settings keep the toy's own storage keys (stimming.fireworks.smoke, .weather, .bill, .scene), so saved choices carry over.
The bill moves under the top-right cluster, so it never hides under a corner.

## Checklist

- [x] Port: header, bar, dl.how, local stepper, grid and popover code replaced by one bar spec
- [x] Space works with focus anywhere outside a control; arrows step the shell
- [x] Diegetic check, recorded in bar-v2-diegetic.md
- [x] Check at 1280, 375 x 812 and 812 x 375 in the pane; tests/bar-v2.html
- [x] Commit, push; tick Fireworks in stimming-80dc

## Summary of Changes

Fireworks runs on Bar v2. Top left: the shell tray with the shell drawings. Bottom left: Showtime (S). Bottom right: Distance; on phones it joins Settings. Settings: Scene, Sky, Smoke, Water, Bill and Quality, on the toy's own storage keys.
Space launches with focus anywhere outside a control, and the arrows step the shell, so the stage no longer needs a click first. The bill sits under the top-right cluster.
Checked in the pane at 1280, 375 x 812 and 812 x 375: corners clear, both sheets fit, Escape closes them, clean console. tests/bar-v2.html: 97/98; the one failure (logo and name over bright stages) is the shell's, already on main.
Diegetic: none fits.
