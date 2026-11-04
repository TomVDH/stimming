# Sunbeam dust (`sunbeam`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** One shaft of light crosses a dark room. Dust motes drift and glint inside it, and your hand stirs them.

**Architecture:** three.js 0.170. The beam is an analytic prism, integrated per pixel in one full-screen pass. The motes are a GPU particle system on `GPUComputationRenderer`, drawn as depth-of-field billboards that light up only inside the beam.

**Tech stack:** three.js 0.170 (GPUComputationRenderer, EffectComposer, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** shortlist 75 in [toy-ideas.md](../toy-ideas.md); rank 8 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | S · $10 to $15 |
| Kits | none (toy-plan.md's optional K3 is not needed) |
| Before the build | nothing |

## The shot

A dark room you never see. Light enters from the upper left through a window out of frame and slants down to the floor.
The floor shows only where the light lands: a warm parallelogram with soft edges.
In the beam, thousands of motes turn and drift. Outside it they are invisible, as dust is in a real room.

## Hero moments

1. **Glints.** Each mote is a tumbling flake. It flashes when its face turns to the light, so the beam sparkles.
2. **Your hand in the air.** A drag leaves a wake: motes swirl into curls behind the pointer and settle over seconds.
3. **Bokeh.** Motes near the lens grow into large soft discs with a bright rim; motes in the beam's middle are sharp points.
4. **Blow.** A breath from the viewer's side sends a cloud of motes tumbling through the beam.

## Loop

- Drag: stir the air.
- Tap: a small puff at that point.
- The chip changes the light: angle, colour and how much glare it has.
- Untouched, the motes drift on slow convection.

## Bar

| Control | Content |
|---|---|
| Chips | Morning, Noon, Golden, Moon |
| Slider | Dust: how many motes |
| Action | Blow |
| Settings | Window: Open, Panes · Focus: Near, Beam, Far · Quality: Standard, High (shared) |
| How | Drag: stir the air · Click/Tap: a puff · Space: blow (mouse devices only) |

| Light | Elevation | Colour (OKLCH) | Character |
|---|---|---|---|
| Morning | 25° | 0.9 0.09 70 | Warm and soft |
| Noon | 55° | 0.96 0.03 95 | Steep and white |
| Golden | 12° | 0.8 0.14 55 | Long, low and orange |
| Moon | 30° | 0.7 0.04 250 | Cool silver; fewer motes show |

## Tech

**Beam pass.** One full-screen shader, before the motes.

1. Move the view ray into beam space: u and v across the window, w along the light direction.
2. Slab tests on u and v give the entry and exit distances.
3. Integrate 12 jittered samples. Density is `0.6 + 0.4 * fbm3(p * 0.5 + drift)`. Phase is Henyey-Greenstein with g 0.55, so the beam glows most when you look toward the light.
4. **Panes:** a cross mask in (u, v) puts the window bars' shadows inside the beam.
5. **Penumbra:** edge softness grows with distance from the window. The sun's disc is half a degree wide, so real edges blur with distance.
6. **Floor:** the floor plane is lit where its point, traced back along the light, falls inside the window rectangle. It takes the same pane mask and penumbra.

**Motes.**

- `GPUComputationRenderer` with one variable: position xyz plus spin phase in w. The texture is 256 × 256 on High and 128 × 128 on Low. The Dust slider sets the draw range.
- **Update:** `p += (curl(p, t) * 0.02 + wake(p)) * dt`. `curl` is analytic curl noise in GLSL. Motes that leave the room box wrap to the far side.
- **Wake:** the last 8 pointer samples become uniforms (position on the plane through the beam's centre, velocity, age). Push is `vel * exp(-d² / r²)`. Swirl is `cross(vel, view) * 0.5` with the same falloff. Each sample fades over 1.5 s.
- **Blow:** one impulse from the camera side. A wide push with curl turbulence for 1.5 s.

**Mote shading.**

| Term | Formula |
|---|---|
| In beam | the same prism test in the vertex shader; 0.03 outside |
| Phase | Henyey-Greenstein, g 0.55 |
| Glint | `pow(abs(dot(n(spin, t), h)), 24.0)`, where `h` is the half vector |
| Focus | circle of confusion `abs(depth - focus) * k`. Size grows and alpha falls by area. Large discs get a brighter rim. |

**Post.** Bloom at a high threshold, so only glints and the floor patch bloom. A grade adds warmth by chip, a vignette and grain.

**First frame.** The motes start spread through the room. The first frame already shows the beam full of still motes.

## Sound

- **Room tone:** pink noise below 2 kHz at −38 dB.
- **Pad by chip,** at −34 dB with a 4 s attack: Morning a soft major ninth, Noon a bright open fifth, Golden a warm suspended chord, Moon cool open fifths in minor.
- **Stir:** a swish, noise through a bandpass whose level follows pointer speed.
- **Blow:** a breath, noise through a bandpass that falls from 800 to 400 Hz over 1.4 s.
- The pad sleeps with the context when the toy idles.

## Finesse

- Dust exists only where light is. Outside the beam the room stays black.
- Glints are rare and brief, never a uniform shimmer.
- Golden's long low beam crosses most of the frame; Noon's steep one is short and bright.
- Moon shows fewer motes, because dim light reveals less dust.
- Wake curls keep turning after the pointer stops, then slowly die.

## Reduced motion and idle

- **Reduced motion:** motes drift at 25 % speed, glints stay but do not flash, and a stir swirls more gently.
- **Idle:** this toy drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input.

## Review focus

1. **No float render targets:** `GPUComputationRenderer` needs them. Without `EXT_color_buffer_float`, show `.fail`.
2. **375 px portrait:** the beam still crosses the frame. The camera pulls back, and the window sits at the upper left.
3. **A drag that leaves the stage:** pointer capture keeps the wake going; `lostpointercapture` ends it cleanly.
4. **A chip change mid-blow:** the light eases to the new rig over 1.2 s, and the motes keep their motion.
5. **Bloom on bright glints:** the threshold stops the screen from flashing white when many glints line up.

## Tasks

### Task 1: The beam

**Files:** Create `sunbeam/index.html` and the bean.

**Produces:** `BEAM_FS`; `rig(name)`, which sets light direction, colour and elevation; the `uLight` uniforms.

- [ ] Beam pass, panes, penumbra, floor patch and grade. Draw the motes once as static points.
- [ ] Q1, Q2 and stills of all four rigs at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Sunbeam dust: the beam, panes and floor patch`.

### Task 2: Motes

**Produces:** `gpu` (`GPUComputationRenderer`), `moteMat`, the Dust draw range.

- [ ] Update shader, glint and focus shading.
- [ ] Screenshots of glints in close-up and of bokeh with Focus on Near.
- [ ] Commit: `Sunbeam dust: tumbling motes with glints and bokeh`.

### Task 3: Hand and breath

- [ ] Pointer state machine, wake uniforms, puff, Blow and rig easing.
- [ ] Q4: drifting at 32 fps or fewer; asleep after 62 s.
- [ ] Commit: `Sunbeam dust: stir, puff and blow`.

### Task 4: Sound

- [ ] Room tone, pads, swish and breath. Q9.
- [ ] Commit: `Sunbeam dust: room tone and breath`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. The beam integrator, marked as a section, suits Leaf shadows (76) or Canal at dusk's lamps later.
