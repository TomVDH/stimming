---
# stimming-t8s2
title: 'Prism: Spectroscope view (Flame test readout)'
status: completed
type: task
created_at: 2026-11-09T18:49:00Z
updated_at: 2026-11-09T18:49:00Z
parent: stimming-ubwe
---

Move Flame test's spectrum readout into Prism as it is. Tom picked the Piece tray placement (2026-11-09).

## Checklist
- [x] Read AGENTS.md, Prism beans, Flame test bean and plan
- [x] Placement to Tom: Spectroscope entry in the Piece tray (approved)
- [x] Port the readout to `prism/spectro.js`: line tables, half-Cauchy half-even map, fan, plate, ticks, loupe, bloom, grade, chord
- [x] Wire it into Prism: tray entry, Settings rows (Element, Spectrometer, Trace sodium, Cobalt glass), Clear and Escape return to the table
- [x] Checks at 1280, 375 x 812 and 812 x 375 (headless, GPU flags); tests/bar-v2.html 98 pass
- [x] Commit and push

## Summary of Changes

- `prism/spectro.js` holds the readout. It builds its WebGL2 canvas on the first open.
- The lamp replaces the flame: Prism's lamp body, with the element glow at the aperture. Flame, grains, blow, air and soot stay with Fire.
- The lamp holds the picked element; the others burn off at their old rates. Tap or Space strikes the lamp and rings the chord.
- The table view, its Settings rows and its key strip do not change. The new rows show only in the spectroscope; the key strip swaps its words there.
- A full table (MAXADD pieces) disables the tray, so the spectroscope cannot open then.
- Not checked: real-device fps, sound by ear.
