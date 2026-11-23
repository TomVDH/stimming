# Smoke light: Fire's smoke lighting in GLSL

Status: done · Bean: `stimming-kxmu` · Tom approved the design, 2026-11-23. Merged in TomVDH/stimming#100 (3d304369).

Tom picked smoke lighting after `shared/precipfield.js` landed (TomVDH/stimming#99). The rule since `stimming-kq0z`: small-scale smoke, fog, steam and cloud volumes use Fire's smoke shading.

## Why

- Fire's smoke shading lives in `shared/fire.js`, in TSL for WebGPU. Raw WebGL2 and three.js toys cannot call it.
- Eight toys paste the same five GLSL lines: Whiteout, Cloud bottle, Wheat, Lava coast, Pickle, Ship launch, Supercon, Hurricane. Six of them also paste Fire's numbers.
- One module keeps the look in one place.

## Goals

1. `shared/smoke.js`, prefix `sm`: Fire's smoke light (Beer, the multiple-scatter lobe, the powder term, the ambient floor) and the Henyey-Greenstein phase, as GLSL for raw WebGL2 and three.js.
2. `SM_FIRE`: the numbers the copies share. `smConsts()` writes a look into GLSL.
3. Whiteout moves onto it in this bean and gives the same frame: 1/255 on a few pixels at most.

## Non-goals

- No shadow march in the module. Each toy samples its own density toward the light, at its own spacing. GLSL cannot pass a density function, and a macro breaks the shared-shader contract.
- No change to `shared/fire.js`, and no WebGL2 twin of Fire's fluid (`docs/plans/fire-smoke.md`, option A, stays on demand).
- No cloud lighting (`clouds.js`, Tornado, Railgun, Gas giant): a different model.
- No other toy moves in this bean. Each adopts in its own chat, in the order Tom picks.
- `docs/standards/code.md` still says a raw WebGL2 toy copies the lighting as a `K3 lighting` section. A standard changes only from Tom's words, so that line waits for him.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| A (picked) | A small GLSL bundle: the light from optical depth, the phase, a preset. Each toy keeps its taps. | Small; fits every copy; the taps stay per toy. |
| B | A also shares the tap march, through a macro. | Every toy spaces its taps its own way; macros break the contract. |
| C | A WebGL2 twin of Fire's whole volume. | Far bigger; the fire-smoke plan holds it for demand. |

## The design

| Name | Does |
|---|---|
| `smTransmit(tau, multi, powder)` | The light that reaches a point through optical depth `tau`: Beer, plus the multiple-scatter lobe (`multi`), darkened at thin edges by the powder term (`powder`) |
| `smLight(tau, multi, powder, ambient)` | `smTransmit` plus the ambient floor, clamped to 0 to 1 |
| `smPhase(c, g)` | Henyey-Greenstein per steradian; a toy multiplies by 4 pi where Fire does |
| `SM_FIRE` | `absorb 2.0, ambient 0.5, powder 0.59, multi 1.0, g 0.55`. Fire's own `asymmetry` default is 0; the GLSL copies use 0.55. |
| `smConsts(look)` | `const float smAbsorb = ..., smAmbient = ..., smPowder = ..., smMulti = ..., smG = ...;` |

The toy keeps: its taps toward the light, how it scales `tau` (`SIG`, `ABSORB`, step lengths), and what it does with the light.

## Results, 2026-11-23

- Same frame: Whiteout at four frozen states, before and after. 0 pixels differ.
- three.js 0.170.0: a `ShaderMaterial` compiles the bundle with no shader log and draws it.
- Whiteout QA: clean console, drifting 63 rAF in 2 s, asleep 0, hidden 1, frame median 7.8 ms and p95 8.4 ms. Load time matches main.
- `node --test tests/smoke.test.mjs`: 5 pass. `npm run check`: no new errors.

## Proof

1. Whiteout frozen at four states (storm, lamp, gust, gale), before and after: 1/255 on a few pixels at most.
2. A three.js 0.170.0 `ShaderMaterial` compiles the bundle.
3. Whiteout QA; `node --test`; `npm run check`; `/code-review` on the PR.
