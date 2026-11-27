---
# stimming-d1zm
title: 'East Van postcard: the Drive, realistic'
status: completed
type: spike
priority: normal
created_at: 2026-11-15T04:57:26Z
updated_at: 2026-11-15T05:23:58Z
parent: stimming-guw5
---

Tom saw the realistic rain lot (stimming-yv08) and asked for the Drive the same way.

- [x] Split real/real.js into a realistic kit (rkit.js) and one module per scene
- [x] The lot scene still matches its still
- [x] The Drive: storefronts with lit rooms, awnings, signs, trolley wires and bus, wet road mirror
- [x] Keys 1 and 2 pick the scene; B flips to the matching block-out card
- [x] Check at 1280 x 800 and 375 x 812; frame cost; clean console
- [x] Side-by-side stills to Tom
- [x] Commit and push

## Summary of Changes

eastvan/postcard/real/ now holds two realistic scenes on one kit.

| Key | Scene | Module | Flip (B) shows |
|---|---|---|---|
| 1 | House lot on East 4th, rain | `lot.js` | block-out card 1 |
| 2 | The Drive, after rain | `drive.js` | block-out card 4 |

- `rkit.js` is the realistic kit: sky baked to the environment map, rain, the lit mirror road (`mirrorRoad`), contact shadow, depth of field, bloom, lens, loop, and the prefabs (`lapWall`, `sash`, `room`, `door`, `porch`, `kerb`, `pole`, `wire`, `tree`, `litter`, `crow`, `lampCone`, `signMat`, `glow`, `wet`). A scene exports `card` and `build(k)`.
- A subagent wrote `drive.js` against the kit and the block-out plan; it drew on its first load. Then mountains, lamp cone and room glow were tuned from stills.
- The Drive: 95 materials, six local lights (two cast shadows), the trolley bus with a headlight spot, slatted crates and 288 fruit on the stand.

| Frame cost at 1280 x 800 | Standard | High (2x) |
|---|---|---|
| Lot | 12.1 ms | 26.7 ms |
| Drive | 12.5 ms | 28.7 ms |

No new downloads: the Drive uses the five texture sets already credited.

What still reads as fake on the Drive: the parked cars (boxy), shop rooms that glow by flat panels, clean flat brick, the mountain outline.

Not checked: reduced motion (by code only), real phones, frame rate with the block-out overlay open.
