# shared/

Code every toy uses. A change here reaches every page.

## Before you edit

- A change here needs its own bean and Tom's yes before the edit. Commit hunks only.
- Shell, menu or multi-toy changes go on a worktree and a PR, with `/code-review` before merge.
- One module at a time. A reference toy proves it first. Other toys adopt it in their own chats.
- A module that should give the same frame must give it: 1/255 on a few pixels at most.

## Files

| File | Rule |
|---|---|
| `stim.js`, `stim.css` | The shell. The JSDoc in `stim.js` is the API reference. |
| `gl.js` | Raw WebGL2 kit. It never imports three.js. Bismuth is the reference. |
| `environment.js` | Environment runner: a toy gives `vec3 envScene(vec2 uv)`. Start a new Environment toy here. |
| `smoke.js` | Fire's smoke light in GLSL: Beer, the scatter lobe, powder, the ambient floor, the phase. Each toy keeps its shadow taps. Whiteout is the reference; no `fxlab/` card. |
| `fire.js` | Fire and smoke (three.js 0.186.1, WebGPU, TSL). It imports nothing; the toy passes the namespaces. Fire is the reference. |
| `wetglass.js`, `water.js`, `precip.js`, `sky.js`, `flare.js`, `glow.js`, `grade.js`, `output.js`, `weather.js`, `detail.js` | Shader bundles. Each has a card in `fxlab/`. Glass effects stay one group. |
| `precipfield.js` | Rain and snow as particles in the world, lit by lamps: streaks, blur discs, the forward lobe. Each toy keeps its crowds, lights and depth test. Whiteout is the reference; no `fxlab/` card. |
| `clouds.js` | Cloud light: the two-lobe phase and light shafts under clouds. The look is common; each toy gives its occlusion source. Railgun is the reference; no `fxlab/` card. |
| `intro.js`, `intro.css` | The intro. Signal ships (`DEFAULT_VARIETY`). It is also the preloader: the load line, and the load note above it (`loadNote`, fed by `buildSteps(n, notes)`). |
| `loadwatch.js` | Load watch for heavy toys: a visible, stored load step. A load that died shows on the next open. Opt-in per toy. |
| `menu/` | The Clock. Rules: `docs/menu.md`. |
| `series/shots.js` | Series shots and `shotIcon()`. |
| `fonts/` | Gabarito, B612, Iosevka Term Slab. A page off the shell links `fonts/fonts.css`. |
| `stills/`, `loops/` | Tube pictures. Rules: `docs/menu.md`. |

## Code

- Every file carries `// @ts-check` and JSDoc on its exports.
- `stim.js` imports culori by the importmap URL, so it loads once.
- Quality: High renders at the screen's pixel ratio (up to 3) with no budget; Standard keeps each toy's caps. A new quality choice clears the slow-frame step.

## Shell (Bar v2)

- Spec and limits: `docs/plans/bar-v2.md`. The shell measures collisions; never rely on a breakpoint alone.
- `tests/bar-v2.html` must pass. Check 1280 px, 375 x 812 and 812 x 375.
- Settings holds what a player may want. Builder tuning goes in `dev: [...]` rows, shown with `?dev`.

## Shell (Bar v3, Signal)

- Spec: `docs/plans/bar-v3.md`. `signal.js` and `signal.css` draw it; a toy opts in with `initPage({ signal: true })`.
- Bar v2 still builds under it, hidden: the spec, the keys, the stored values and the handles are the same ones.
- Bar v2 comes out when Tom has signed off Bar v3 on every toy (Tom, 2026-11-17). Until then both must work.
- `?bar=signal` and `?bar=v2` pick one on any Bar v2 toy, for a side-by-side check.
- `barlab/` is its workbench. A change of look starts there.

## Intro

- The intro is the preloader. `progress(part)` runs 0 to 1 and never goes back. The intro lifts on its `ready` promise.
- `stage(name)` puts `libs` at 0.3, `build` at 0.5, `first-frame` at 0.95. `buildSteps(n)` gives a `step()`.
- The load line shows only when the toy still loads 10 frames after the titles open. It fills in 6 frames when ready.
- The flash sequence takes no breathing or pulsing parts. Boxes, lines, cuts and steps only.
- The logo's centre (`--origin`) never moves at any intro beat.
- Reduced motion: no creep, no sheen; a still line and "Loading" after 1.2 s.
- The overlay's failsafe is 10 s.
- A look is a variety with `look`, `style`, optional `stack` and `fonts`. Every look shares the base beats. `introlab/` tunes them.
