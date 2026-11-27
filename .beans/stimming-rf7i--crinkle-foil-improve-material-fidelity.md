---
# stimming-rf7i
title: 'Crinkle foil: improve material fidelity'
status: in-progress
type: task
created_at: 2026-11-27T22:21:13Z
updated_at: 2026-11-27T22:21:13Z
---

Refine one Foil fidelity pass, preserving the sheet and current controls.

- [x] Inspect the existing shader and toy history.
- [x] Confirm the first visual direction with Tom.
- [x] Implement the approved fidelity pass.
- [x] Check JavaScript syntax and compile/link both changed GLSL programs.
- [x] Review the saved still and confirm the local route returns HTTP 200.
- [ ] Check the live render, gestures, console, and three viewport sizes.
- [x] Give Tom the local preview route.

## Changes

Tom approved the material pass with "Go".
- Add broad reflected panels and retain the moving strip lights.
- Filter strip edges and add subtle directional rolling marks.
- Shade fine crease valleys and reduce bloom.
- Preserve highlight detail with a gentler output curve.

## Validation

JavaScript syntax, GLSL compile/link, and diff whitespace checks pass.
The existing server returns HTTP 200 for `/foil/`.
The toy page is 40,819 bytes; no assets or libraries were added.
This session exposes no in-app browser tool. Live visual QA remains open.

NEXT: Tom reviews http://localhost:8000/foil/ in the in-app browser. Check Silver, Gold, Holographic, Smooth, Shuffle, and three viewport sizes before publishing. Keep this commit local pending that look.
