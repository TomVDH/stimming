---
# stimming-x0ru
title: 'Spike: Cloud tube funnel (deck cloud pulled down)'
status: completed
type: spike
priority: normal
created_at: 2026-11-17T06:49:00Z
updated_at: 2026-11-17T07:13:27Z
parent: stimming-dwwg
---

Tom asked: can the funnel be the deck cloud shader stretched and tubed down? Probe it behind a Dev row, Funnel: Shells / Cloud tube, default Shells.

- [x] Cloud tube mode in tornado/funnel.js (TUBE define), Dev row in tornado/main.js
- [x] Both modes run with no console errors
- [x] GPU time per frame at 1828 x 984: F1, F2.5, 3 x F4.5
- [x] Stills in docs/qa/tornado-tube/
- [x] Report: what reads better or worse

## Summary of Changes

Cloud tube mode behind the Dev row Funnel (TUBE define in tornado/funnel.js; it compiles when first picked). Timings, stills and the read are in docs/qa/tornado-tube/README.md. The tube costs the same for one tornado and about 7 to 15 per cent more for three F4.5 wedges. It reads as spinning smoke that joins the deck with no seam; it loses the shells' bright, solid cone and billows, and the bands do not read at scene distance. Tom decides.

## Merged into main's scene (2026-11-17)

Tom asked for the tube in the main toy. main merged into the branch; main's tornado/funnel.js and main.js taken whole, the tube re-added in the merged pass. Dev group Tube: Funnel choice, Bands, Band count, Stretch. 3 x F4.5 at 28 mm, 1828 x 984: minimum frame 17.4 ms Shells, 17.1 ms Tube. Stills: docs/qa/tornado-tube/merged-*.
