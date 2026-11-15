# Phaeton rework: Strobe studio

## Context

Phaeton (`phaeton/index.html`, Lab, alpha) is a rail gun that fires through a row of targets in bullet time.
Tom, 2026-11-15: the idea stays; the hit is weak and the look is wrong. The build starts again from zero.

Tom's decisions today:

| Question | Answer |
|---|---|
| Scope | Same idea, new build: rail gun, hand loading, mixed row, charge sets the reach |
| Look | Strobe studio: a black room, one hard flash, targets big in the frame |
| The hit | A photo per target: close camera, flash, time almost stops; at the end the lights come up and all falls at once |
| Time scrub | Yes, as a second step; the debris runs both ways from the start |

Not flagged by Tom, so they stay: the Load, Lock, charge, fire loop; the name; the motto "Through everything".

## Correction after the first spike (Tom, 2026-11-15)

Tom saw the first spike (a plain black bench, a new first-pass gun) and corrected the direction:

| Tom said | What it means for the build |
|---|---|
| "I like the atompunk style and the loading process" | The old machines stay as they were: the seafoam gun, the rack and crane, the tubes, the generator, the console, the signs. They move into the dark lab (`phaeton/machines.js`). The Load, Lock, charge, fire steps stay |
| "I do not see a strobe lab in this" | The lab must read as a photo lab. Tom's pick: the photo as an object. Each flash leaves a print on a glass plate in a lightbox above the row |
| "The toy isn't intuitive, but that's for another time" | Open item for a later round. No change now |

Not picked by Tom, so not built: shock waves in the air, strobes that fire in view, lab instruments.
Where the rest of this plan says "black, chrome and anodised set" or "gun and loading in the new look", this section wins.

## Approaches

| | Approach | Trade-off |
|---|---|---|
| **A (picked)** | three.js 0.170 WebGL. Pre-fractured meshes. Every pose is a pure function of one shot clock `T` | Free scrub and exact stills. Needs closed-form debris, no stacking physics |
| B | Step-by-step physics, record every frame for the scrub | Real piles. About 20 MB per shot, and stills are not repeatable |
| C | WebGPU (three 0.186) with compute particles | More drops. The scene is small and close; fill rate is the cost, not count |

A is my call: the photo per target and the scrub both need exact control of time.

## Design

### The picture

- A black studio. One long optical bench carries the gun (left) and six targets on thin posts.
- Light: a dim cool modelling light; one hard key flash with a shadow; one rim light with no shadow.
  The rim hue runs along the row from the toy's accent: orange (55) at target 1 to blue (268) at target 6.
- The set is black, chrome and anodised metal. The targets carry the colour.
- No sky, no tilt-shift, no transmission. Glass and water read by reflection and a fresnel rim on black.
  A small softbox environment (bright rectangles on black, PMREM) gives chrome and glass their highlights.
- Lens: bloom on hot parts only, depth of field in the close-ups, `gradePass()` from `shared/grade.js`, `OutputPass`.

### The shot

1. Wide shot of the bench while you load, lock and charge (the steps and keys stay: L, K, hold Space or hold the stage).
2. Release: the room goes dark. The camera is close on target 1.
3. The slug arrives. The flash fires. Time runs at about 1/500 for about 1.2 s: entry hole, shards, exit cone, full frame, with a slow push of the camera.
4. Dark again; a fast travel along the bench to the next target. Repeat.
5. Where the energy ends, the last photo shows the slug held in that target.
6. The lights come up on the wide shot. Time returns. Everything falls at once.
7. Refill after 4 s. S shuffles the row.

- Energy stays as today: `E = 0.15 + 1.25 · charge`; each target takes its resistance.
- The Slow-mo slider sets how long each photo holds.
- Step two (after Tom's verdict on the hit): after the shot, a drag on the stage runs `T` backward and forward.

### The targets (first pool; my proposal)

| Kind | Break |
|---|---|
| Light bulb | A thin shell in sharp shards; the filament glows and dies |
| Apple | A small entry, a wide exit cone of flesh and juice; skin outside, flesh on cut faces |
| Water balloon | The skin tears and pulls back; the water keeps its shape for a moment, then turns to drops |
| Playing card (edge on, own design) | Cut in two halves that tumble |
| Gel block | No break: a cavity swells along the track and wobbles; the slug slows in plain view |
| Steel plate | A hot hole, petals that open away from the gun, sparks |

More kinds (ice, wine glass, egg, melon, concrete) come one by one after the first six.

### How it is built

- **Two clocks.** `s` is the director's playhead in real seconds. `T = W(s)` is the shot time.
  Matter (slug, pieces, drops) reads `T`. Camera, flash, `scene.environmentIntensity` and sound read `s`. The scrub moves `s`.
- **A photo is a slug position, not a fixed rate.** The six hits span about 6 ms of `T`. `W` holds the slug inside each target for the photo; cone debris leaves at 0.1 to 0.5 of the slug speed, so the cone always shows.
- **Debris.** `debris.js`. Each piece releases at its own time: slug pass time plus distance from the bore over the crack speed. In a frozen photo the entry side is open and the far side is whole.
  Pose = flight, two closed-form bounces (restitution 0.3), a friction slide to a dead stop; spin eases to a flat rest pose. All of it runs in the vertex shader, forward and backward.
  The CPU solves at fire: first contact time, the off-bench flag (the piece falls into black), pile relaxation (landing spots pushed apart, stacked in layers), slug `x(T)` with drag per target.
- **Geometry.** One merged mesh per target, a piece id per vertex, piece data in a float `DataTexture`. Only drops, sparks and crumbs are instanced. Each debris mesh has a `customDepthMaterial` with the same vertex code, so shadows follow.
- **Fracture.** `fracture.js`, plain JS, 40 to 60 cells per solid, a few ms each. It runs in idle time (`later()` in `shared/stim.js`) during the intro and the load steps; buffers per kind keep a fixed size and are rewritten at refill.
  Solids: Voronoi cells cut with bisector planes; outer faces keep the skin material, cut faces the inner one. Shells: a tessellated shell grouped by nearest seed, with thickness. Seeds are denser near the slug axis.
- **Glass with no transmission.** An additive reflection pass with no depth write; then the same mesh writes depth only, so the blur sees it.
- **Balloon.** Tear fronts run from the entry and the exit; the skin discards behind a noisy front. The water is a sphere with ripples and an exit bulge, then drops.
- **Gel.** A cavity radius pulse follows the slug; block vertices move out by it and a damped shear makes the wobble. An alpha fresnel shell sits over a bright cavity mesh.
- **Depth of field.** Not `BokehPass`: it redraws with an override material and loses the shader-moved debris. Use the Launch pattern (`launch/index.html:2335-2399`): an own target with a depth texture and a gather blur. Standard: half size, 16 taps. Low: off.
- **Slow frames.** `detail()` from `shared/detail.js` replaces the toy's own ladder (wiring as `ascent/index.html:209-216`). Levels set blur taps, shadow size and piece count. A level change waits for the end of the shot. One hidden mid-burst frame behind the intro compiles every program.
- **MSAA once:** canvas `antialias: false`, 4 samples on the scene target. This closes bean `stimming-orpt` for the new page.
- **Comfort.** Flash onsets are 0.5 s apart or more. A Flash setting: Full, Soft (250 ms ramps, a 30% floor), Off (steady light). Reduced motion forces Off, the wide camera and half the pieces. The scrub always uses steady light, because a fast drag can strobe.

### Bar (Bar v2)

| Slot | Content |
|---|---|
| Top left | none (the other modes stay in Classic) |
| Bottom left | Load (L), Lock (K), Fire (held, Space) |
| Bottom right | Slow-mo (how long each photo holds); at step two it becomes Time, the scrub's keyboard twin |
| Keys | `[CLICK] rack, lever` · `[HOLD] charge` · `[RELEASE] fire` · `[S] shuffle`; at step two `[DRAG] time` takes the fourth place |
| Settings | Camera: Photos, Wide · Flash: Full, Soft, Off · Quality · footer Reset |
| Dev (`?dev`) | Flash power, rim hue, depth of field, photo time scale, pin one target kind, freeze at `T` |

### Files

| File | Role |
|---|---|
| `phaeton/legacy.html` | Today's page, kept as Classic (`noindex`); Corridor, Aquarium and Depth live on there |
| `phaeton/index.html` | New: shell, Bar v2 spec with `dev` rows (pattern: `railgun/index.html:149-200`), renderer, loop |
| `phaeton/looks.html` | The look spike (step 2), `noindex`; removed when `index.html` takes over |
| `phaeton/shot.js` | The two clocks, `W(s)`, the photo sequence, energy and stops |
| `phaeton/debris.js` | Closed-form kinematics (JS and GLSL twin), the piece texture, drops, dust |
| `phaeton/fracture.js` | Voronoi cells, shell shards |
| `phaeton/targets.js` | The six kinds: build, hit, materials |
| `phaeton/rig.js` | Bench, gun, flash heads, loading machines, softbox environment |
| `tests/phaeton-core.test.mjs` | `node --test`, as `tests/washline-core.test.mjs`: clocks, debris, fracture |
| `toys.json` | `phaeton.legacy: true` |
| `docs/plans/phaeton.md` | Replaced by this plan in the repo's plan form |
| `.beans/stimming-xh8y--toy-rail-gun.md` | A "Rework (Tom, 2026-11-15)" checklist |

Reused as they are: `initPage`, `audioKit`, `whenVisible`, `reduced`, `onReducedChange`, `stage`, `pageReady`, `later` (`shared/stim.js`); `detail()` (`shared/detail.js`); `gradePass()` (`shared/grade.js`).

Ported from today's page (line ranges in `phaeton/index.html`): sound 1564-1768 without the diesel chain; gun states and crane timeline 1770-1842; charge 1849-1863; energy 1877-1881; loop 2206-2227; pointer 2229-2265; QA 1953-1987, where `at` becomes `seek(T)`.
Dropped: post 150-205, sky 216-279, targets and hits 832-1563, camera 2141-2176, the ladder 2190-2204.

The two builds share `stimming.phaeton.*` storage; the new bar rows take new ids.

The menu icon, the name, the motto and the Lab place do not change.

## Order of work

Branch: worktree `.worktrees/stimming-xh8y`, branch `feature/stimming-xh8y`, merged by PR (ADJUDANT git rule for a feature bean). `main` keeps today's toy until Tom says yes.

1. **Set up.** Worktree, bean checklist, `docs/plans/phaeton.md`.
2. **Look spike, then stop for Tom.** `looks.html` and `rig.js`: studio, bench, wide shot. Then `fracture.js` and `debris.js` with tests first, and one light bulb: `__qa.seek(T)` gives the same frame from both directions. One frozen close-up to Tom at 1280, 375 × 812 and 812 × 375.
3. **The sequence** (`shot.js`): six photos, dark travel, lights up, refill, on bulbs only.
4. **The six kinds** (`targets.js`), one at a time, each with a still; 30 fps at Standard in every photo.
5. **The page.** New `index.html`: gun and loading in the new look, bar, sound (adds a flash pop and the recharge whine), Flash setting, phones. Today's page moves to `legacy.html` and `legacy: true` lands in the same commit.
6. **Verdict from Tom on the hit.** Then **step two: the time scrub** (drag and the Time slider move `s`).
7. Later, only when Tom asks: Corridor, Aquarium and Depth in the new look; more target kinds.

## Verification

- Main risk is fill rate (frame-filling shards, MSAA, blur): piece caps per level, no MSAA above pixel ratio 2, the shadow map updates only when `T` moves.
- `node --test tests/phaeton-core.test.mjs`: `W(s)` is monotonic; a piece's pose at `T` is the same forward and backward; no piece rests under the bench; every Voronoi cell is closed and the cells fill the solid.
- `tests/run.sh` (`tests/bar-v2.html`) passes.
- Browser pane at `http://localhost:8000/.worktrees/stimming-xh8y/phaeton/index.html`: clean console; load, lock, charge, fire; a weak shot stops in the row; refill; S; Reset; Classic link opens `legacy.html` and back.
- Stills from `?dev` freeze at each photo, at 1280 px, 375 × 812 and 812 × 375.
- Reduced motion and Flash off: no pop, wide camera.
- Frame time with the pane visible; the hidden pane's numbers do not count.
- No hold or debug build stays loaded in the shared tab after a check.
