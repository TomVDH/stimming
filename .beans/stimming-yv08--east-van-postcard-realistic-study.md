---
# stimming-yv08
title: 'East Van postcard: realistic study'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T04:24:49Z
updated_at: 2026-11-15T04:53:55Z
parent: stimming-guw5
---

Question: what does a realistic postcard cost, and does it beat the block-out?

Subject: postcard 1, the house lot on East 4th in the rain at blue hour. Same framing, hour and weather. Page: eastvan/postcard/real/ (noindex, unlinked).

- [x] Asset list to Tom (file, source, size, licence); his yes before any download
- [x] Geometry with real profiles: siding, sashes, gutters, trim, shingles, tree
- [x] Physically based materials with a wet response; puddles
- [x] Light: image-based ambient, lamp cone in the rain, interior light, contact shadows
- [x] Lens: depth of field, bloom
- [x] Loop: rain, rings, wires, crow, TV flicker
- [x] One key flips block-out and realistic on the same camera
- [x] Check at 1280 x 800 and 375 x 812; frame cost on Standard and High; download size
- [x] Side-by-side stills to Tom
- [x] Commit and push, with CREDITS rows

## Summary of Changes

eastvan/postcard/real/ (noindex, unlinked): `index.html`, `real.js`, 15 texture files in `assets/`. Key B lays the block-out card over the page on the same lens.

| | Block-out card 1 | Realistic |
|---|---|---|
| Frame cost, 1280 x 800, Standard | about 9 ms | 13.6 ms |
| Frame cost, 1280 x 800, High (2x) | about 20 ms | 27.1 ms |
| Download beyond the libraries | about 60 kB of code | 57 kB of code plus 9.9 MB of textures |

What makes it read as real:
- Lap siding as real boards, sash windows with depth, rooms behind the glass, gutters, porch boards and balusters, a tree that branches down to twigs.
- Physically based materials; rain darkens and smooths them. The road is lit asphalt with a true mirror in it, bent by the asphalt normal map; puddles hold a clean reflection.
- Light from the sky itself (the page bakes its own sky into the environment map; no sky image was downloaded). The street lamp and the porch lantern both cast shadows. Contact shadow (GTAO), a little depth of field, bloom, colour fringe, grain.

What still reads as fake:
- The firs, the crow, the black lawn, the flat lit curtains, the neighbours (clean flat walls).
- Everything is too clean and too straight: no dirt, no moss, no sag.

Not checked: reduced motion (by code only), real phones, frame rate with the block-out iframe also open.

Verdict: it beats the block-out as a photograph and loses to it as a postcard: the block-out has more warmth and charm per pixel. Take other cards this way only where wet light is the subject (the Drive, the corner store); budget one long session and about 10 MB each.
