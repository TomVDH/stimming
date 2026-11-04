# Ink in water (`ink`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Drop ink into a tall, still tank. It falls as a vortex ring, breaks into mushroom fingers, and colours mix the way real inks do.

**Architecture:** Fire's WebGPU smoke grid (K3), retuned: dye is heavier than water, so it sinks, and dye carries three absorption channels for colour. A custom TSL raymarch draws the tank either backlit (light through ink) or dark field (light scattered off ink).

**Tech stack:** three.js 0.186.1 WebGPU and TSL, the build Fire uses; Tone.js through `kit.tone()`.

**Spec:** shortlist 35 in [toy-ideas.md](../toy-ideas.md); rank 7 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M · $20 to $30 |
| Kits | Builds K3 from `fire/index.html` |
| Before the build | D3 (WebGPU only, three.js 0.186.1) and D4 (a bright stage) |

## The shot

A tall, thin slab of water fills the stage. Nothing frames it: no glass, no stand.
Behind it is a soft lightbox, brightest in the middle, warm at the top and cool at the foot.
The only edge is the water's surface: a thin bright meniscus line near the top.
The first frame shows one indigo plume already halfway down, so the stage opens as a picture.

## Hero moments

1. **The vortex ring.** A drop pierces the surface, rolls into a ring, sinks, then breaks into fingers that fold over (Rayleigh-Taylor).
2. **Real colour mixing.** Inks absorb light, so saffron through indigo reads green, and carmine through indigo reads violet. This follows from the absorption values, not from a palette.
3. **Dark field.** The same sim lit from the side against black: the ink glows like smoke.
4. **The pipette.** Hold, then move: a thread of ink follows your finger and hangs in the water in 3D.

## Loop

- Tap: a drop falls in from the surface at that x, at a random depth.
- Hold (260 ms), then move: the pipette lays a thread of ink at the pointer, in the slab's middle plane.
- Drag fast: stirs the water along the path.
- Ink stays until Clear. It thins and drifts slowly, as real ink does.

## Bar

| Control | Content |
|---|---|
| Chips (dot plus name) | Indigo, Carmine, Sumi, Saffron, Mixed |
| Slider | Weight: how much heavier the ink is than water |
| Action | Clear |
| Settings | Light: Backlit, Dark field · Water: Still, Drift · Quality: Low, Medium, High |
| How | Click/Tap: drop · Hold: pipette · Drag: stir · Space: drop (mouse devices only) |

| Ink | Absorption σ (r, g, b) | Dark-field scatter colour |
|---|---|---|
| Indigo | 1.0, 0.4, 0.08 | 0.62 0.14 265 |
| Carmine | 0.12, 1.0, 0.7 | 0.6 0.2 15 |
| Sumi | 0.95, 1.0, 1.05 | 0.75 0.01 80 |
| Saffron | 0.03, 0.22, 1.0 | 0.82 0.15 75 |
| Mixed | each drop takes the next ink in turn | |

Check: indigo plus saffron sums to (1.03, 0.62, 1.08), so green passes most. Keep green low in both inks if the values change.

## Tech

**K3 lift.** Copy Fire's `storage 3D textures`, `fluid simulation kernels` and `async warm-up` sections, and `hasWebGPU()` and `noWebGPU()`. Then change the following.

| Item | Fire | Ink |
|---|---|---|
| Grid, x × y × z | 100 × 100 × 200 | High 96 × 160 × 48 · Medium 72 × 120 × 36 · Low 48 × 80 × 24 |
| Dye channels | density, temperature, age | rgb absorption, a = mass |
| Buoyancy | heat rises | `vel.y -= g * weight * dye.a`; Weight runs 0.2 to 2 |
| Pressure iterations | 2 | 16 (High), 10 (Low); keep the count even, as Fire notes |
| Dye advection | semi-Lagrangian | MacCormack, clamped to the neighbour min and max, for sharp filaments |
| Dissipation | smoke fades in 2.4 s | none; a slight diffusion only |
| Walls | velocity fades near the box | keep the fade; the tank walls are the box |

Vorticity confinement (`curlPass`, `uVorticity`) stays; it keeps the fine curls. Weight it by dye mass, not by temperature.

**Emitters.**

- `drop(x, z)`: a sphere of dye, three cells in radius, at the surface. Inside it, velocity is set to `−v0` downward. The jet rolls into a ring by itself.
- `pipette(p, v)`: small emission each frame at `p`, with velocity `v` from the pointer.
- `stir(path)`: velocity splats along the drag path, in the middle plane.
- Emission runs through an emitter buffer, as Fire's `emitPass` does. Cap it at 8 emitters per frame.

**Render.** A custom TSL raymarch on a box mesh, with `side: BackSide`, at the tank bounds.

- Steps: 64 on High, 40 on Low. Jitter the start of each ray with a hash, so bands do not show.
- **Backlit:** `L = B(uv) * exp(-∑ σ_rgb * a * ds)`, plus a small forward-scatter term. `B` is the lightbox: OKLCH 0.96 0.01 90 at the core, falling to 0.8 at the edges.
- **Dark field:** `L = ∑ T * σ_s * a * light * phase`. The light comes from the left at 70°. Each sample takes an 8-step shadow march toward the light, as Fire's `volumeCastShadow` does. The background is black with a faint haze.
- **Surface:** the meniscus is a bright 1 px line. After a drop, a ripple ring spreads on it for 0.8 s, and a caustic flicker plays on the lightbox just below it.

**Clear.** Dye multiplies by `exp(-dt / 0.4)` for 1.5 s, and a soft upward wash adds a little motion.

**Ready.** Compile every compute pass with `compileComputeAsync`, seed one indigo drop, run 90 sim steps, then draw one frame. All of it happens inside `ready`, under the 9 s cap.

## Sound

- **Drop:** the real drip sound is the bubble a drop pulls under, ringing as it rises. A sine glides 600 Hz to 1.6 kHz in 40 ms, with a little noise splash.
- **Bloom:** a low-passed noise swell over 2 s, at −30 dB.
- **Pipette:** a soft fizz while held.
- **Stir:** a muffled swish, noise below 500 Hz, its level following speed.
- **Clear:** one long, soft wash.

## Finesse

- The ring tilts and wobbles a little before it breaks, from a small random tilt in the jet.
- Heavier ink (Weight up) makes longer, faster fingers; light ink spreads in sheets and hangs.
- Thin edges of ink go a lighter tint before they vanish: Beer-Lambert at work, free from the model.
- Drift (Settings) adds a very slow convection roll, so old ink keeps moving like a real tank.

## Reduced motion and idle

- **Reduced motion:** stir is half strength, the ring forms more slowly, and the caustic flicker is off.
- **Idle:** the sim keeps running while ink moves. Run at 30 Hz (Fire's banking) after 12 s without input. Sleep 60 s after the last input; the last frame holds.

## Review focus

1. **No WebGPU:** Fire's notice, and nothing else runs. No console error beyond Fire's own path.
2. **Drop spam:** 20 taps in 1 s. The emitter queue caps at 8 per frame, and the rest wait for the next frame.
3. **Clear while the pipette is held:** the thread stops, and clearing completes.
4. **Hidden tab mid-sim:** the sim stops. On return it resumes from the same state.
5. **A slow GPU:** the watchdog steps the grid down. A grid change re-seeds with the current ink resampled, not wiped.

## Tasks

### Task 1: The tank at rest (K3 lift)

**Files:** Create `ink/index.html`, with Fire's importmap and a 0.186.1 note in its head comment. Create the bean.

**Produces:** marked `K3` sections; `GRID` (x, y, z); `dyeTex` (rgba16f); `uWeight`; `raymarch(mode)`.

- [ ] Lift K3, with the grid and the channel changes in Tech.
- [ ] Backlit raymarch, lightbox and meniscus. Seed the first-frame plume.
- [ ] Q1, Q2 and stills at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Ink in water: the tank, K3 lifted with sinking colour dye`.

### Task 2: Drops and colour

**Produces:** `drop(x, z)`, `clear()`, the inks table.

- [ ] Jet emitter, MacCormack dye, Weight and the five inks.
- [ ] Screenshots: an indigo ring at 0.5 s and at 3 s; saffron over indigo.
- [ ] Commit: `Ink in water: vortex-ring drops, five inks that mix by absorption`.

### Task 3: Pipette, stir, dark field and the ladder

- [ ] The pointer state machine, `pipette()`, `stir()`, the Dark field mode, Drift, and the watchdog with grid steps.
- [ ] A screenshot of the dark field. Checkpoint with Tom.
- [ ] Commit: `Ink in water: pipette, stir, dark field`.

### Task 4: Sound

- [ ] Every voice in Sound. Q9.
- [ ] Commit: `Ink in water: drip, bloom, fizz and swish`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Q2 also runs without WebGPU, to check the notice.
- [ ] Tick the bean and record the cost. Commit.

## Kit handoff

K3, marked, with the grid size, dye channels, buoyancy sign and pressure iterations as named constants at the top of the section. Dry ice fog copies it from here, not from Fire.
