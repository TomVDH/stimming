---
# stimming-h4a1
title: 'Soup cauldron: the scene shader does not link on Windows (D3D11)'
status: completed
type: bug
priority: high
created_at: 2026-11-22T08:52:05Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-fskg
---

Tom, 2026-11-22: Soup cauldron and Tornado alley need a performance fix on Windows.

Found on the Windows desktop (RTX 3070, ANGLE D3D11, the app's browser pane): the pot stays black.
`program(SCENE_FS)` links for 94 s, then fails. The WebGL context is lost.
The scene GLSL is 81 KB. FXC inlines it to about 31,000 HLSL lines.

- [x] Reproduce on D3D11 and time the link
- [x] Find the parts that make FXC slow (offline d3dcompiler_47)
- [x] Fix with no change to the picture: the scene in five passes (Tom: "Split into passes", 2026-11-22)
- [x] Scene links on D3D11; the pot draws; console clean
- [x] Same frame before and after (headless Chromium, ANGLE GL, seeded random, fixed clock, 300 frames at Fire 1: 0 pixels differ by more than 8 of 255)
- [ ] Tom checks it live

## Findings (2026-11-22)

Method: headless Edge saves ANGLE's HLSL with the link skipped (6 s); `d3dcompiler_47` times it at ANGLE's level (`tools/fxc/` on `feature/stimming-azxj`). Offline level 1 matches the browser: 70.6 s offline, 66.5 s in the pane.
The browser gives up near 90 s: the old scene failed at 94 s, then the context was lost.

| Change (each exact) | FXC level 1 |
|---|---|
| None | 152 s |
| `textureLod` in looped reads (no texture has mipmaps) | 140 s |
| `bodyN()`: four taps through one `sdBody()` call | 140 s |
| `S3()` atlas read on `textureLod` | 122 s |
| `sdAll()` loop bound is `gNc`, not 8: no unroll | 86 s |
| `sdKind()`: one return | 74 s |
| Marches find the hit; the hit is shaded after the loop | 71 s |

Tried, not kept: one `thingLook()` call for both soup hits in a 2-pass loop (85 s, slower). A never-taken `discard` does not change ANGLE's FXC flags (65 s).

Stub tests (level 1): `sdKind()` out, 23 s; `thingLook()` out, 37 s; `shadeSoup()` out, 32 s. Optimisation skipped: 10 s. The optimiser is the cost, not the line count.
The rest needs a structure change: the scene split into passes, as Tornado alley does on `stimming-azxj`.

## Five passes (2026-11-22)

One source, five programs by `#define`: G (hit buffer), T (thing normal and look), S (soup rays and the ring), L (each soup ray's thing, drawn twice), then the light.
Buffers: one RGBA32F hit buffer; three RGBA32F that T and S share (their pixels never overlap); two RGBA16F for L.

| Pass | FXC offline | Link in the pane (D3D11) |
|---|---|---|
| G | 1.8 s | 2.1 s |
| T | 3.2 s | 1.9 s |
| S | 7.5 s | 9.4 s |
| L | 1.2 s | 1.3 s |
| Last | 6.6 s | 8.0 s |

Links run in parallel (`KHR_parallel_shader_compile`); `linked()` waits without blocking. First frame about 20 s from a cold shader cache.

The fire: `S3()` reads on `textureLod`. On ANGLE GL the old gradient read in the fire march dimmed the flames (undefined in a loop with varying iterations); the flames are now taller there. This is the one visible change from this bean.
Open: S and the last pass could split again for a faster first load.
