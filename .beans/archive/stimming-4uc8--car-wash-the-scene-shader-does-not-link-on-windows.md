---
# stimming-4uc8
title: 'Car wash: the scene shader does not link on Windows (D3D11)'
status: completed
type: bug
priority: high
created_at: 2026-11-22T10:18:34Z
updated_at: 2026-11-27T07:19:52Z
parent: stimming-auj3
---

Tom, 2026-11-22: Car wash must load on Windows (Edge/Chrome, ANGLE D3D11, RTX 3070).

Measured: the scene fragment shader inlines to about 86,700 HLSL lines. FXC at ANGLE's level does not finish it in 300 s. The browser gives up near 90 s; the WebGL context is lost and the tab locks up.
Route (Tom chose it for Soup cauldron and Tornado alley): split the scene shader into small passes, with the picture unchanged.

- [x] Save each pass's HLSL; time it with FXC at ANGLE's level
- [x] Split the scene into passes by #define; parallel links and an async wait before the first frame
- [x] Every pass compiles under 10 s offline
- [x] Same frame before and after (headless Chromium, ANGLE GL, seeded random, fixed clock): see Findings for three rounding cases
- [x] Guard the NaN sources in the page (Tom: yes, 2026-11-22); the shared sky goes to stimming-wehv
- [x] First frame in the app pane on D3D11, no freeze; console clean
- [x] Toy doc updated
- [ ] Tom checks it live

## Findings (2026-11-22)

Nine programs from one source, by `#define`. The world nests outside, tunnel, desert; the passes run deepest first.
Each pass writes colour and distance to an RGBA32F buffer; the next reads it with `texelFetch`. Seven run a frame.

| Pass | Draws | FXC level 1, offline |
|---|---|---|
| D | The desert past the exit | 1.8 s |
| E, F | The entrance past the exit (Exit is entrance only) | 4.6 s, 2.0 s |
| T | The tunnel | 4.6 s |
| O, P | Outside, in two halves | 5.4 s, 3.2 s |
| L | Arches, figure, bonnet | 3.4 s |
| M | Blower, curtains, wax, brushes, mitters, foam fall | 5.8 s |
| N | Mitters on the glass, air glow, snow, spray | 0.6 s |

In the app pane (D3D11, RTX 3070): first frame at 9.5 s, no freeze, console clean, 8 ms frames in the run.

FXC traps found on the way:
- `d` and `dw` set only in the seat branch of `main()` made FXC overflow its stack in L, M and N. Both are now set on every path.
- Bonnet and blower in one pass: 16 s. The blower now opens M.
- The bonnet inlined three mirror rays. `emitRay2()` follows one ray at two widths: 3.4 s.
- A stubbed function that returns the colour makes the code before it dead. Stub times for such functions mislead.
- `fxc.py` runs the compile on Python's main thread; large passes overflow its stack there. Run it on a thread with a larger stack.

Same frame (headless Chromium, ANGLE GL, seeded random, no free clock; the shot, ten stops, six strange moments; HDR scene compared):
- Matches to half-float precision, except for three rounding cases. A few edge pixels of thin poles change.
- One arrow bulb flips off in the shot: `cwH(gq * 7.3 + 1.0)` rounds differently.
- NaN pixels on the anti-sun line move: one more in the shot's sky (a flare), one fewer at the blower.

Pre-existing on Windows (NVIDIA, GL and D3D11), in the old build too: `pow()` of a negative base is NaN, and bloom makes each NaN a flare.
- `mitters()`: `round1 = sin(clamp(lf / 0.77, 0.0, 1.0) * 3.1416)` dips below 0. `pow(round1, 14.0)` fills large blocks from the entry to the soak. `max(round1, 0.0)` clears them.
- `cloth()` `pow(round1, 10.0)`: single pixels on the brushes.
- `shared/sky.js` `skDusk()`: `pow(0.5 + 0.5 * az, 3.0)` on the anti-sun line, also in reflections (canopy fascia). Shared: `stimming-wehv`.
- The bonnet and wall Fresnel bases can go just below 0.

