---
# stimming-kg00
title: 'Tornado alley: crashes the browser on open (Zen, Edge, Windows desktop)'
status: completed
type: bug
priority: normal
created_at: 2026-11-18T04:19:13Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-dwwg
---

Still crashes after stimming-bykd. Not reproduced on the M3 Pro headless or in the app pane.

- [x] Load watch in place of ?trace (stimming-jxxg): stored step, shown on the next open
- [x] After a load that died, the first try draws a third of the pixels
- [x] Tom runs it on a crashing browser (Edge on the Windows desktop, RTX 3070, ANGLE D3D11)
- [ ] Pick the fix: split the scene into passes, or a lighter D3D11 build
- [ ] Fix from the trace

## Trace: Windows desktop, 2026-11-17

Cause: the D3D11 shader compiler (FXC) does not finish the scene shader.

- Edge on ANGLE D3D11 links the five programs at 0.5 s.
- `COMPLETION_STATUS_KHR` stays false for the scene program. After 4 minutes it is still false.
- Before stimming-vebz the link blocked the main thread, and the tab crashed. Now the page waits at the build stage.
- The scene GLSL is 227 KB. ANGLE translates it to 352 KB of HLSL.
- An M3 Pro and a phone do not use FXC. Their compilers keep function calls, so they link in seconds.

`D3DCompile` (d3dcompiler_47, ps_5_0), offline, one system kept and the others stubbed:

| Kept | Compile time |
|---|---|
| None | 10 s |
| Storm, ground, debris, wires, trees fly | 26 to 39 s each |
| Infra | 77 s |
| Line poles | 104 s |
| Farm | 91 s |
| Plain | more than 7 min |
| Traffic | more than 7 min |
| All, optimizer skipped | more than 7 min |

These do not help: `textureLod` in `N()` and `W()` (ANGLE already makes `Lod0` copies), `[loop]` on all 80 loops, and `gl.flush()` before each poll.
The cost is FXC inlining. It copies each large function into each call site.

Second fault: on ANGLE GL (`--use-angle=gl`) the shader links, but the first frames reset the GPU (context lost at "Drawing the first frames").
