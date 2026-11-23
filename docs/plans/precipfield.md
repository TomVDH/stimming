# Precip field: lamp-lit rain and snow particles

Status: done · Bean: `stimming-24qv` · Tom approved the design, 2026-11-23. Merged in TomVDH/stimming#99 (1847f2ad). Frietkot adopts next, in its own bean.

Tom, 2026-11-23, on Whiteout: "the lamp and glow and flare as well as the snow and how it interacts, very well done. Any way this can slot into any of our shared modules?" He picked lamp-lit precip first, and Frietkot as the rain reference.

## Why

- `shared/precip.js` draws rain and snow on the frame. Its own header says: rain that must pass through a lamp's beam in the world still needs particles.
- Five toys write their own world particles for this: Whiteout (snow, raw WebGL2), Frietkot, Canal, the East Van postcards and Bread (rain, three.js).
- One module gives every new rain or snow toy the lamp-lit look in a few lines (the 200-toy goal).

## Goals

1. A new shared module, `shared/precipfield.js`, prefix `pf`: world-space rain and snow streaks, lit by lamps, for raw WebGL2 and three.js.
2. Whiteout moves onto it in this bean and gives the same frame: 1/255 on a few pixels at most.
3. The design holds Frietkot's needs, so Frietkot can move onto it in its own chat.

## Non-goals

- No change to `shared/precip.js`, its users or `shared/environment.js`.
- No fxlab card now: the runner draws one full-screen pass, and particles need an instanced draw. `clouds.js` set this precedent. The two reference toys are the proof.
- No Frietkot, Canal, postcard or Bread change in this bean. Each adopts in its own chat, after Tom's look.
- No rain shafts, rings or glass: other modules hold those.

## Constraints

- The shared shader contract (`docs/plans/shared-shaders.md`): GLSL functions only, no uniforms, no varyings, no `main`; the `pf` prefix on every name; the module brings its own hash; the JS imports nothing.
- It compiles in raw WebGL2 (`#version 300 es`) and in a three.js `ShaderMaterial` (GLSL3).
- The corner of a quad comes in as an argument. Whiteout takes it from `gl_VertexID`; a three.js toy takes it from its plane's `position`.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| A (picked, my call) | GLSL functions in a new file. Each toy keeps its own small `main`: it places its crowds and sums its own lights, and calls `pf` functions for the rest. | Works in both runtimes. Each toy keeps about 20 lines of its own. |
| B | A raw WebGL2 program builder with hooks (project, light, depth), as `environment.js` does. | Less code in a raw toy, but no three.js toy can use it, and four of five users are three.js. |
| C | Add the particle functions to `precip.js`. | One file for all rain and snow, but `precip.js` is a flat screen effect, and a change there touches its three users. |

## The design (as built)

GLSL in `PRECIPFIELD`:

| Function | Does |
|---|---|
| `pfHash3(n)` | Three random numbers per drop |
| `pfFlutter(t, w, ph, amp)`, `pfFlutterVel(...)` | A drop's own small loop, and its speed for the streak |
| `pfPlace(r, lo, size, drift, fall, flutter)` | A drop's place in a box that wraps; `drift` and `fall` are the travel so far |
| `pfPx(clip, res)` | Clip space to pixels |
| `pfCoc(dist, focus, aper, resY)`, `pfWidth(radPx, coc, cocMax)` | The blur disc off the focus plane, and the streak's half width, never under 0.7 px |
| `pfCorner(k)`, `pfPlaneCorner(xy)` | The quad's corner from `gl_VertexID`, or from a three.js plane's `position` with the winding kept |
| `pfStreak(s0, s1, w, corner, res, z)` | A screen-space capsule from tail to head; returns `PfStreak { pos, q, len, w }`. `z` feeds the depth buffer in three.js |
| `pfSpread(radPx, len, w)` | The light spread over the streak and the disc |
| `pfPhase(c, g)` | The forward lobe (Henyey-Greenstein) |
| `pfPoint(k, d2, soft, sig)` | A point lamp at the drop; `k` is the toy's beam or mask |
| `pfCover(q, len, w)` | The fragment: a capsule with a soft edge |
| `pfOff` | A vertex the rasteriser drops |

JS: `PF_SNOW` (Whiteout's numbers), `PF_RAIN` (start values for Frietkot), and `pfFloat(x)`, which writes a preset number into GLSL.
A count per quality level (`pfDetail`) was dropped: crowd sizes belong to each toy.

What stays in each toy:

- Where its crowds live: Whiteout's two boxes, Frietkot's band that widens with depth and its dry roof.
- Its lights and their masks: Whiteout's cone, Frietkot's window, neon, strip and cars.
- Its depth test: Whiteout reads its G-buffer; three.js tests the depth buffer.

## Proof

1. Freeze Whiteout (`?qa`, fixed storm time) and capture the frame at four states: storm, lamp, gust, gale. Port. Capture again. The largest difference is 1/255 on a few pixels at most.
2. QA Q1 to Q10 on Whiteout again.
3. `node --check`, `npm run check`.
4. `/code-review` on the PR before merge.

## Results, 2026-11-23

- Same frame: Whiteout frozen at four states (storm, lamp, gust, gale) at 1280 x 800, before and after the port. 0 pixels differ.
- three.js 0.170.0: a `ShaderMaterial` on an instanced plane compiles with no shader log and draws rain streaks, face culling on.
  A plain `(position.y + 0.5, position.x * 2.0)` corner flips the winding, and three.js culls every drop. `pfPlaneCorner` holds the fix.
- Whiteout QA: clean console; drifting 62 rAF in 2 s; asleep 0; hidden 1; Space and G; Lamp, Gust and Wind controls; frame median 7.7 ms, p95 8.4 ms.
- `node --test tests/precipfield.test.mjs`: 5 pass. `npm run check`: no error in these files (three earlier errors stay in `shared/flare.js`).

## Next

- Frietkot moves onto the module in its own chat. Its streaks become soft capsules and gain the forward lobe, so its look changes a little: Tom looks first.
- Canal, the postcards and Bread follow only if Tom picks them.
