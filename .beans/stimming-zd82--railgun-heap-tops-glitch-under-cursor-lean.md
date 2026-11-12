---
# stimming-zd82
title: 'Railgun: heap tops glitch under cursor lean'
status: completed
type: bug
created_at: 2026-11-12T08:17:31Z
updated_at: 2026-11-12T08:17:31Z
parent: stimming-f793
---

Tom sees the heap clouds' tops shimmer, grainy, like z-fighting, while the view moves. The storm towers stay clean. Branch claude/railgun-clouds-b17a13.

## Checklist
- [x] Reproduce: jump map under cursor lean, heaps vs towers
- [x] Ablate one term at a time; record jumping pixels per term
- [x] Fix at the cause; keep the soft cumulus look, wisps behind, no dusk darkening
- [x] Stills at dusk, noon, night at 1280x800 and 375x812; clean console
- [x] Jump map after the fix

## Cause

The heap shape hashes the card seed `vS.w` with a sin hash (`hsh`, times 43758).
`vS` was a plain varying, so the GPU interpolates it across the card.
The interpolated value wobbles by one ulp from pixel to pixel.
The hash turns that wobble into new turret centres, widths and heights per pixel.
A camera lean moves the barycentrics, so the scrambled pixels change each frame.
The towers do not call `hsh`, so they stay clean.

## Fix

`vS` is `flat` in `CLOUD_VS` and `CLOUD_FS`. The values are per card, so nothing else changes.
The heap look, the wisps behind and the dusk brightness stay as they were.

## Evidence

Harness: headless Edge (D3D11), 1280 x 800, grain 0, time 0.5 (dusk).
The cursor sweeps the stage for 90 frames, with `__qa.run(1/30)` between moves.
A pixel jumps when its second time difference of luma exceeds 12/255.
Masks: the heap and tower areas come from frames with each layer hidden.

| Run | Heap px that jump | Heap jump events | Tower px | Tower events |
|---|---|---|---|---|
| Before (base) | 6454 of 12038 | 97414 | 1233 | 15103 |
| `vS` flat | 1075 | 6250 | 760 | 7997 |
| Seed rounded in `hsh` | 1196 | 6769 | 799 | 7809 |
| Fine cells off | 6506 | 100281 | 1266 | 14194 |
| Self-shadow taps off | 8060 | 101707 | 1452 | 15189 |
| Pillow normal flat | 5139 | 63602 | 1012 | 10928 |
| Edge 4x softer | 4183 | 44917 | 927 | 8614 |
| Wisps off | 6202 | 95553 | 1187 | 13245 |
| After the fix (two runs) | 1147 / 1100 | 6536 / 6385 | 741 / 652 | 7843 / 6929 |

Only the seed terms remove the flicker. After the fix, the heaps sit at the towers' level.
The jumps that remain are the moving outline, as on every other edge.
The depth test is not the cause: the flicker covers whole heap bodies against open sky.

Images in `docs/qa/railgun-heaps/`:
- `jump-before.png`, `jump-after.png`: the jump map (red: jumps; blue: heap mask; green: tower mask).
- `seed-hash-before.png`, `seed-hash-after.png`: the turret hash as colour. Before, it speckles per pixel; after, each card is one colour.
- `before-dusk-1280.png`, `after-dusk-1280.png`: the speckled heap tops, then clean.
- `after-noon-1280.png`, `after-night-1280.png`, `after-dusk-375.png`: the look at other hours and on a phone.

Console: clean (only the local server's favicon 404).
