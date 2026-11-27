---
# stimming-kc8x
title: 'Bubble wand: move to Bar v2'
status: completed
type: task
priority: normal
created_at: 2026-11-09T10:50:38Z
updated_at: 2026-11-09T10:59:02Z
parent: stimming-80dc
---

Move bubbles/index.html to Bar v2. Brief: docs/plans/bar-v2-migration.md. Migration epic: stimming-80dc.

## Control map

| v1 control | v2 slot | Why |
|---|---|---|
| Blow chip (hold) | Bottom left: action `Blow`, key Space, hold breathes a stream | The one own verb; held like Space |
| Clear chip | Bottom left: action `Clear`, key P | Shared verb: pops them all |
| dl.how | Key strip: move slow, move fast, click (touch: drag slow, drag fast, tap) | Three entries; Space and P show on their chips |
| Quality (v1 tray) | Settings: site Quality row | Site row |
| header data-shell | Shell: logo, name, sound, (i) | Shell |

No choice and no slider. No Reset: Clear empties the air, and the wand returns home by itself.

## Checklist
- [x] Read brief, spec, Galaxy, Rain port, Bubble wand
- [x] Play v1 at 1280 and 375
- [x] Port to one bar spec; delete dead CSS and JS
- [x] Fix bugs found in play
- [x] Check at 1280, 375 x 812 and 812 x 375 in the pane
- [x] Diegetic proposal with one still
- [x] Commit, push, tick bubbles in stimming-80dc

## Diegetic proposal (awaits Tom)

The wand is already the pointer. Proposal: hold anywhere on the air to blow through the ring; the Blow chip goes, Space stays as the keyboard path, and the key strip reads `[HOLD] blow`. Clear stays a chip. Still: `bubbles-diegetic-hold-to-blow.jpg` in the batch notes folder.

## Summary of Changes

Bubble wand passes one bar spec to initPage. Blow (held, Space) and Clear (P) sit bottom left. Settings holds the site Quality row. Key strip: move slow, move fast, click; touch words on phones.
Fixed: the resting wand handle reached the bottom chips and the key strip on short touch stages; it now rests above the bottom row and further left on short stages. Space no longer blows from inside the Settings sheet. The intro fallback dropped its stale number line.
Blow uses the shell's held action (99844f5): onDown and onUp. Space binds through the shell (3d22888); the page keeps no key handler.

## Mobile and compliance
Checked at 1280 x 800, 375 x 812 (mobile preset) and 812 x 375, plus 760 x 375 for touch in landscape. No corner overlaps another or the key strip. No control leaves the stage. No sideways scroll. The Settings sheet fits. Touch chips are 36 px, sheet chips 34 px. The resting wand clears every corner. Console clean.
