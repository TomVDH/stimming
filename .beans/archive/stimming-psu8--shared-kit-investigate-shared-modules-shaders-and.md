---
# stimming-psu8
title: 'Shared kit: investigate shared modules, shaders and effects'
status: completed
type: spike
priority: normal
created_at: 2026-11-23T19:23:42Z
updated_at: 2026-11-23T19:40:38Z
parent: stimming-3s8z
---

Tom, 2026-11-23: "open a new subsession that investigates shared modules, shaders and components (e.g. shaders, effects, droplets, glass window shader, fog etc etc -- We are on to something good here)".

Question: which effect copies across toys move into shared/ first, with what API, and how does each switch prove the same frame?

Plan only. No edit in shared/ or in any toy folder.

- [x] Read the standards and the module plans
- [x] Inventory shared/*.js and their adopters
- [x] Trace toy copies and forks per effect family
- [x] Rank promotions; propose an API per module
- [x] Write docs/plans/shared-kit.md with a status line
- [x] Commit the bean and the plan through tools/commit.sh

## Summary of Changes

Wrote `docs/plans/shared-kit.md` (status: proposed). Real imports of every shared module, then four read-only sweeps of every toy folder by effect family.

- Inventory per family: versions, best toy, stack, drift, cost.
- Ranked promotions: 1 `volume.js` (K3 lighting, 9 copies), 2 `fluidgl.js` (4 WebGL2 fluids, heat bend), 3 `sparks.js` and `heat.js`, 4 water kit v2, 5 post sweep; 6 to 10 in short.
- API per module, the proof per kind of copy, a kit-first rule proposal, a volume workbench proposal (not built).
- Doc finding: `docs/standards/code.md` names `jethover/fluid.js`, which no longer exists. Not edited: a standard changes only from Tom's words.
- Five open questions for Tom. No change in `shared/` or in any toy.
