---
# stimming-4dkg
title: 'Rain on glass: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T09:10:27Z
updated_at: 2026-11-09T09:18:59Z
parent: stimming-80dc
---

Move rain/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Drizzle, Rain, Storm chips | Top left: choice `Weather`, segments (phones: stepper bottom left); Space steps it | One choice group, three options |
| Wind slider | Bottom right: main slider `Wind` | The one continuous control |
| (none) | Settings: site Quality row | High renders at the screen's ratio; the slow-frame step falls back to Standard |
| dl.how | Key strip: drag wipe the fog, arrows wipe a stripe, space next weather | Three entries; touch shows drag only |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No actions and no Reset: the toy has nothing to clear or reset.

## Checklist
- [x] Read brief, spec, Galaxy, Rain
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280 and 375 in the pane
- [x] Diegetic verdict
- [x] Commit, push, tick rain in stimming-80dc

## Diegetic check
None fits. Drag already wipes the glass in the scene. Weather and wind are the sky outside the pane, so a part on the glass would be fake.

## Summary of Changes

Rain passes one bar spec to initPage. Weather segments top left (stepper bottom left on phones), Space steps them. Wind is the main slider, bottom right. Settings holds the site Quality row. Key strip: drag, arrows, space; touch shows drag only.
Fixed: the page ignored site Quality; High now renders at the screen ratio, and the slow-frame step falls back to Standard. The intro fallback still said Stimming Lab. Page keys no longer fire inside the Settings sheet.

## Mobile and compliance (80559e3)
Checked at 1280 x 800, 375 x 812 (mobile preset) and 812 x 375. No corner overlaps another or the key strip. No control leaves the stage. No page scroll. The Settings sheet fits at each size. The canvas draws no UI, so no corner hides any of it. At 375 the shell drops the name to avoid a collision.
