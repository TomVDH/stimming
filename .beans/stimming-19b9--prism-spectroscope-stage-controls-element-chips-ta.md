---
# stimming-19b9
title: 'Prism: Spectroscope stage controls (element chips, Table, nm readout)'
status: completed
type: task
created_at: 2026-11-09T20:08:16Z
updated_at: 2026-11-09T20:08:16Z
parent: stimming-ubwe
---

Tom's second light-table UX slice (2026-11-09). Desktop first, responsive checked.

- [x] Element chips (dot + symbol) under the lamp; they wrap and centre on a narrow stage.
- [x] A Table chip returns to the light table (Clear and Esc still work).
- [x] The loupe shows the wavelength under it, and names the line there (589.0 and 589.6 nm Na read apart).
- [x] Fix: chip presses no longer fall through to the table.
- [x] Checks: 1280, 375 x 812, 812 x 375; tests/bar-v2.html 98 pass.

Known: at 812 x 375 the chip row sits where the key strip shows for its first seconds.
