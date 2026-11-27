---
# stimming-v2t5
title: 'Menu: demote Tornado alley and Wind farm to Lab Slate'
status: completed
type: task
priority: normal
created_at: 2026-11-27T04:40:05Z
updated_at: 2026-11-27T04:40:56Z
---

Demote Tornado alley (`tornado`) and Wind farm (`windfarm`) from the main shelf to the Lab's Slate section (Tom, 2026-11-26).

- [x] Update `toys.json` (`number: null`, `version: null`, `sub: "Stimming Lab"`, `slate: true`; move entries to Lab block)
- [x] Move `tornado` and `windfarm` tiles from main shelf to Lab shelf in `index.html`
- [x] Add `Stimming Lab` fallback subtitle to `tornado/index.html` and `windfarm/index.html` intros
- [x] Verify JSON, menu script syntax, and `shared/menu/dial.js` parsing

## Summary of Changes

Demoted `tornado` (Tornado alley) and `windfarm` (Wind farm) from the main shelf to the Lab Slate section across `toys.json`, `index.html`, `tornado/index.html`, and `windfarm/index.html`.
