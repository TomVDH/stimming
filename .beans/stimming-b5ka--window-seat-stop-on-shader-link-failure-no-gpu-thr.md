---
# stimming-b5ka
title: 'Window seat: stop on shader link failure, no GPU thrash'
status: in-progress
type: bug
priority: normal
created_at: 2026-11-10T17:27:19Z
updated_at: 2026-11-10T17:27:28Z
parent: stimming-w1nd
---

A visitor's GPU failed to link the window shaders (empty log), then the context was lost and restored in a loop.

- [x] renderer.debug.onShaderError stops the loop and shows a message
- [x] context loss stops the loop; restore wakes it only if nothing broke
- [x] injected link error tested: message shows, canvas hides
- [ ] find the visitor's device and lighten the shader for it
- [x] Stand-in: a light outside pass (sky, haze, flat land) draws while the full pass compiles in the background
- [x] Swap: the full pass takes over when it is ready; the stand-in fades out over 1.5 s
- [x] A full pass that fails to link keeps the stand-in instead of stopping the toy
- [x] QA: cold and warm start, 1280, 375 and 812 x 375 px, clean console

## Cold start on Direct3D (2026-11-14)

Measured in headless Chrome, ANGLE D3D11, no shader cache, on the dev PC.

| Program | Link time |
|---|---|
| Outside pass (2,284 lines) | 28 to 31 s |
| Cabin pass (821 lines) | 1.8 s |
| Each wing material | 0.2 to 0.3 s |

- The first frame waits about 35 s; Chrome's disk cache hides it on later visits.
- No single function causes it. Stubbing the deck, flashes, lamps, sea, airports or roads one at a time changes nothing.
- Uniform loop bounds and `#pragma optimize(off)` change nothing.
- The cost is superlinear in size: without the ground, 11.2 s; the ground alone, 10.8 s; both, 28 s.
- A slower laptop can pass the GPU watchdog's limit. That fits this bean's empty link log and the context-loss loop.

Options for Tom:
1. Split pass 1 into a ground program and a sky and cloud program. About 11 s each, in parallel with KHR_parallel_shader_compile. The ground then draws under thick cloud too.
2. Draw a light stand-in first, and swap in the full shader when its background compile ends.
3. Compile only the land mode in use (relief or flat): a small saving.

## Stand-in, then swap (Tom's pick, 2026-11-14)

- `standIn(src)` in `window/shader.js` stubs the clouds, towers, rain shafts, sprites, aurora, fog and towns; the land is `landFlat`.
- The stand-in shares the full material's uniforms, so both get every frame's values.
- `renderer.compileAsync` compiles the full pass with KHR_parallel_shader_compile. A cached program ready within 300 ms skips the stand-in.
- The fade lays the stand-in over the full pass with a constant-alpha blend.
- `?standin` pins the stand-in, for a look at it.

| Start (headless, ANGLE D3D11) | First frame | Full pass |
|---|---|---|
| Before, cold | 37 s | 37 s |
| After, cold | 7.9 s | 33 to 34 s |
| After, warm | 1.0 to 1.6 s | at once |

- 60 fps while the full pass compiles: the page never blocks.

