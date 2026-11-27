---
# stimming-tl38
title: 'Soap cutting: bar to the control bar standard'
status: completed
type: task
priority: normal
created_at: 2026-11-03T20:43:55Z
updated_at: 2026-11-03T20:47:02Z
parent: stimming-4mty
---

Tom: bring the Soap cutting bar to the Control bar standard in AGENTS.md (a8a95fd).

- [x] The swatch slider pill becomes a chip group, a dot plus a name per chip
- [x] Swirl moves into Settings (sliders icon, before the (i))
- [x] New bar and Blow stay as actions
- [x] Keys 1 to 6 still pick the soap and the chips follow
- [x] QA at 1280 and 375 with a clean console
- [x] Commit through a private index and push

## Summary of Changes

- The bar now reads: Mint, Amber, Charcoal, Layers, Coral as dot chips, then New bar and Blow, then Settings and the (i).
- "Swirl" was not a separate control. It was the name of the sixth soap, shown in the slider pill. Six options exceed the five-chip limit, so Swirl goes into Settings.
- Swirl is a toggle in the tray. Off returns to the last soap from the bar. Settings lights while Swirl is in use, because no bar chip is pressed then.
- Swirl moves last in `SOAPS`, so keys 1 to 5 match the bar chips and 6 is Swirl.
- The first soap on load now comes from the bar five, so one chip is always pressed on load.
- A pointer pick hands focus to the stage, so Space, N, B and the number keys keep working after a pick.
- QA: headless Chromium with GPU flags at 1280 and 375, console clean. At 375 the bar takes three rows and clears the soap; the open tray briefly covers Coral.
