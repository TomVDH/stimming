---
# stimming-w8a5
title: 'Ferrofluid: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T10:52:20Z
updated_at: 2026-11-09T10:58:44Z
parent: stimming-80dc
---

Move ferro/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Play notes (v1, 1280 and 375)

- Field strength has no visible control. Only the wheel and the minus and equals keys set it.
- A touch screen has no way to set field strength.
- The page keys also fire inside the Settings sheet.
- The idle loop sleeps: no frames once the field settles.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Ink, Alien, Magma, Oil chips | Top left: choice `Fluid`, segments with a colour dot (phones: stepper bottom left); keys 1 to 4 | One choice group, four options |
| Scroll dial (no control) | Bottom right: main slider `Field`, synced with scroll, pinch and minus or equals | The one continuous value; touch had no path to it |
| Drip button | Bottom left: action `Drip`, key D | One own verb |
| Quality row (qualitySetting) | Settings: site Quality row | Shell owns it |
| dl.how | Key strip: hover move the glow, hold + drag charge and lift drops, scroll field, space full field | Four entries; touch shows hold + drag and pinch |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No Reset: the dish returns to rest by itself.

## Checklist
- [x] Read brief, spec, Galaxy, Ferrofluid
- [x] Play v1 at 1280 and 375
- [x] Diegetic verdict and one still
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812 and 812 x 375 in the pane
- [x] Commit, push, tick ferro in stimming-80dc

## Diegetic check

Proposal, not built: the lit groove on the plinth becomes the field dial. A lit arc on the right shoulder shows the strength; drag the steel knob along it. It replaces the Field slider. Minus and equals stay its keyboard path. Still: ferro-diegetic-field-dial.jpg in the migration notes folder. Builds only on Tom's yes.

## Summary of Changes

Ferrofluid passes one bar spec to initPage. Fluid segments top left with a colour dot each (stepper bottom left on phones), keys 1 to 4. Drip bottom left, key D. Field is the main slider, bottom right (in Settings on phones). Settings holds the site Quality row. Key strip: hover, hold + drag, scroll (pinch on touch), space.
Fixed: field strength had no visible control and no touch path; the Field slider and a two-finger pinch now set it, in sync with scroll and minus or equals. The slider brings a lifted magnet back over the dish, so a change shows. Page keys no longer fire inside the Settings sheet.

## Mobile and compliance

Checked at 1280 x 800, 375 x 812 (mobile preset), 812 x 375, and 740 x 375 for touch landscape. No corner overlaps another or the key strip. No control leaves the stage. No sideways scroll. The Settings sheet fits. Console clean. The idle loop sleeps. The canvas draws no UI.
