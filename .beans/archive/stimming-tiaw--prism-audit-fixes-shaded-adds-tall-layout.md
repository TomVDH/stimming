---
# stimming-tiaw
title: 'Prism: audit fixes (shaded adds, tall layout)'
status: completed
type: bug
created_at: 2026-11-09T19:29:13Z
updated_at: 2026-11-09T19:29:13Z
parent: stimming-ubwe
---

From the Prism audit (2026-11-09).

- [x] A new piece no longer lands upstream of a lit piece on the same light. Repro: turn the base prism, add six pieces fast; the lamp's beam fed a mirror placed in front of everything.
- [x] A tall stage turns the opening scene 1.2 rad, so the spectrum runs down the long side. Wide stages keep the old layout.
- [x] Checks: 8 add runs at 1280, stills at 1280, 375 x 812, 812 x 375; tests/bar-v2.html 98 pass.
