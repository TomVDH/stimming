---
# stimming-4fc4
title: 'railgun: group the Dev and Settings sheets'
status: completed
type: task
priority: normal
created_at: 2026-11-16T20:01:36Z
updated_at: 2026-11-16T20:10:19Z
---

Railgun's Dev sheet is one flat list of about 38 rows from seven sessions. Add an optional group key to bar rows in the shell and sort railgun's Dev and Settings rows into labelled groups. No ids, values or defaults change.

- [x] Shell: optional group key on Settings and Dev rows
- [x] Railgun Dev rows in groups
- [x] Railgun Settings rows in groups
- [x] Verify at 1280 and 375
- [x] Tell the railgun sessions

## Summary of Changes

- shared/stim.js: rows take an optional group key; a new value opens a labelled s2-sec. Rows with no group render as before.
- railgun: Settings in Play, View, Graphics. Dev in Sound, Tests, Ambient, Sky, Land, Gun, Lens, Grade, Performance. Ids, values and defaults unchanged; owners confirmed nothing to drop yet (Far ranges goes after Tom signs off the bake).
- tests/bar-v2.html: 105/108, the same three narrow-resize failures as on HEAD.

Follow-up: dropped Requiem layers open (owner: Requiem signed off with the layers off; goOpen is now false) and the uncommitted Giant age row (owner reverted the storm cells).

Follow-up (Tom: Requiem only): dropped the Game over sound row; goMix is the constant 'requiem'. The other takes stay in code.
