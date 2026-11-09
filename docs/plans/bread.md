# Broodautomaat (`bread`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A bread vending machine glows alone at the edge of a dark Flemish village road at night. Drop a coin: the carousel turns, a hatch swings open on a warm loaf.

**Architecture:** three.js 0.170. A small diorama of plain boxes and one drum, lit by a `RectAreaLight` tube, a warm glow from the machine face and a car's `SpotLight`. Post: bloom, grade and a tilt-shift pass.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RectAreaLightUniformsLib), Tone.js through `kit.tone()`.

**Spec:** Tom's Belgian series (2026-11-09): Broodautomaat, Frietkot at night, Lit motorway, Beer pour, Chocolate tempering. Batch rules in [README.md](README.md). Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $20 to $35 |
| Kits | K2 bloom and grade, lifted from `canal/index.html` |
| Before the build | nothing |

## Why three.js, not raw WebGL2

- The scene is real geometry: a drum of hatches that turns, doors on hinges, a car that drives past. three.js gives the camera, the meshes and `compileAsync` for free.
- `RectAreaLight` is a true area light. A fluorescent tube is a long, thin area light; it gives the soft, wide falloff on the casing and the ground.
- A `SpotLight` with one shadow map gives the hero shadow: the machine's shadow swings across the field as a car passes.
- K2 bloom and grade already exist for three.js in `canal/index.html`.

## The shot

One lit stop in a vast dark landscape, at toy scale.

- **Camera:** low and wide, about 0.9 m above the road on the near verge, 30 mm equivalent. The machine sits right of centre in the lower third.
- **Machine:** a plain tall box in dark enamel on a concrete pad. A flat canopy over it holds one bare fluorescent tube. The front shows a drum of glass hatches in three tiers, lit warm from inside. A small coin panel sits at the right, with a green dot and a slot.
- **Header:** a plain lightbox over the drum with a loaf pictogram. No word, no brand.
- **Road:** a two-lane village road in front, black asphalt with a worn white edge line. The tube light makes a pool on it.
- **Land:** flat fields to a far horizon. A row of poplars as a silhouette. Far away, a church tower and four or five farm windows. The horizon has a faint sodium skyglow from a town out of frame.
- **Sky:** deep blue-black, a few stars, a thin band of low cloud lit orange from below.
- **Tilt-shift:** a sharp band through the machine; above and below, the blur grows. The scene reads as a model.

Shapes stay few and plain. Light, haze and glow carry the scene.

## Hero moments

1. **The coin.** A clink, the green dot blinks, the drum turns with a motor whirr and stops with a little overshoot. A hatch door swings open. Warm light spills out onto the pad, and steam curls up through the tube light.
2. **The car.** Headlights rise over the road from far away. The beam sweeps across the fields, and the machine's long shadow swings across the land. The car passes in a whoosh, and its red tail lights shrink into the dark.
3. **The tube.** Tap it: it dies, the ends glow orange, the starter ticks, and it strikes back with two or three blue-white stutters. The moths scatter, then spiral back in.
4. **Rain.** The road turns to a black mirror. Every light makes a long vertical streak on it. Drops show only inside the light.

## Loop

- Tap the coin slot, or press Coin: buy a loaf.
- Tap the open hatch: take the loaf. The door swings shut with a clunk; the compartment stays dark.
- Tap the tube: it flickers out and strikes back.
- Tap a moth or the air near the tube: the moths scatter.
- Drag: look round a little, with parallax.
- Untouched, the moths circle and the tube hums. A car passes every 25 to 60 s.

## Physical details

- **Mains hum.** Belgium runs at 50 Hz, so the tube hums at 100 Hz, with its harmonics.
- **A dying tube** glows orange-pink at its two ends while the middle stays dark. The starter ticks before each strike.
- **Tube colour.** Cool white with a green cast (a 4000 K phosphor). The loaf light is warm, at about 2700 K. The two colours contrast.
- **Moths** keep a fixed angle to the light, so their paths are spirals that close in on the tube. They tick against the glass.
- **Dipped beams** in Europe have an asymmetric cut-off: the right side reaches higher and further.
- **Doppler.** The car's pitch drops as it passes.
- **The coin** is a two-euro coin: a gold ring around a silver core glints once as it drops.
- **Steam** shows only where the tube light is behind it.
- **Wet asphalt** stretches each reflection into a long vertical streak.

## Finesse

- The first frame is a picture: the tube is lit, the moths fly, the drum glows, one far car's tail lights fade on the horizon.
- The drum's turn eases in and out, with a 2 % overshoot and a settle.
- Empty compartments stay dark. When all are empty, Reset restocks them, one tier at a time.
- The car's shadow is sharp near the machine and soft far away.
- On sleep, the moths land on the lit face of the machine and stay still. Any input makes them take off.
- A tap always answers in the same frame: a flash, a flinch, or a light.

## Bar v2

| Slot | Content |
|---|---|
| Top left | logo, `/ BROODAUTOMAAT`, `LAB` tag. No choice. |
| Top right | Sound, Settings, (i) |
| Bottom left | `Coin` (key Space), `+ Car` (key C) |
| Bottom right | Slider `Tube`: steady to dying (how often it flickers by itself) |
| Bottom centre | `[CLICK] coin slot` · `[CLICK] tube` · `[CLICK] open hatch` · `[DRAG] look` |

Four visible controls.

## Settings

| Row | Type | Values | Persist |
|---|---|---|---|
| Rain | toggle | Off, On | yes |
| Tilt-shift | slider | 0 to 1, default 0.6 | yes |
| Moths | slider | 0 to 1, default 0.5 | yes |
| Letterbox | toggle | Off, On | yes |
| Quality (site) | choice | Standard, High | site |
| Reset (footer) | | restocks the drum, closes the hatch | |

## 375 px recompose

- Portrait: the camera steps back and up a little. The fov goes from 38 to 58.
- The machine moves to the centre, in the lower half. The canopy and the tube sit at about 45 % height, so the moths show against the sky.
- The road crosses the frame low; the fields and the skyglow fill the band above it.
- The tilt-shift band narrows and moves with the machine.
- The bottom row holds Coin and + Car. The Tube slider moves into Settings.

## Tech

**Scene.**

- **Machine:** a `RoundedBoxGeometry` casing with a box cut-out (an extruded frame). A drum of 3 tiers × 8 sectors; each sector is a compartment with a glass door on a hinge. One loaf per compartment: a squashed capsule with a crust shader.
- **Light:** the tube is a `RectAreaLight` (1.2 × 0.04 m) under the canopy, aimed down and out. It also has an emissive cylinder that blooms. The machine face adds a weak warm `RectAreaLight` aimed out to the pad. A dim blue `HemisphereLight` gives the moon.
- **Ground:** one plane for the road and one for the field, with a noise shader. The edge line is in the road shader.
- **Far land:** a silhouette band of poplars, a church tower and far windows on a curved strip. Fog is shader haze by distance, as in K2.
- **Sky:** a big sphere with a gradient, a skyglow band, stars and a cloud strip.
- **Car:** two warm headlight sprites, two red tail sprites, a dark box body, and one `SpotLight` (shadow map 1024, 512 on Standard) that rides with it. An additive cone mesh gives the beams volume in the haze.
- **Moths:** 8 to 24 points in one `Points` cloud. Each follows a log-spiral around the tube plus noise. A wing flutter scales the sprite.
- **Steam:** about 60 soft sprites per open hatch, lit only by the tube direction.

**Post.**

1. RenderPass on a half-float target with 2× MSAA.
2. K2 bloom (threshold just under the tube's brightness).
3. Tilt-shift: one ShaderPass. Blur radius grows with screen distance from the focus band; 12 Poisson taps; bright taps weigh more, so the blur makes bokeh discs.
4. K2 grade: tint, vignette, grain.
5. OutputPass, ACES.

**Rain (Settings).** The road roughness drops and a mirror pass renders the light sources at half size, flipped. The road shader stretches the mirror vertically with noise. Rain streaks are a `LineSegments` cloud lit only inside the tube light and the car's cone.

**Frame loop.** README rules: lively at full rate while a hatch, a car or a flicker is in flight; drifting at 30 fps for the moths; asleep after 60 s.

## Sound

- **Tube hum:** 100 Hz plus 200 and 300 Hz, at −40 dB, with a soft buzz that rises during a flicker.
- **Starter tick:** a short click with a high bandpass.
- **Coin:** three inharmonic FM partials (about 2.1, 3.7, 5.4 kHz), then a rattle down the chute.
- **Motor:** a sawtooth through a low-pass, pitch up on start and down on stop.
- **Hatch:** a low thump plus a latch click; the close is heavier.
- **Car:** filtered noise and a low engine tone, panned with the car, with Doppler. Tyre hiss doubles in rain.
- **Bed:** faint wind; in rain, a soft patter and drips.

## Reduced motion and idle

- **Reduced motion:** no camera drift, moths drift slowly, the flicker is one soft dip, the drum turns without overshoot.
- **Idle:** drifting at 30 fps; asleep 60 s after the last input, with the moths landed.

## Review focus

1. `RectAreaLight` needs `RectAreaLightUniformsLib.init()` before the first compile.
2. The spot shadow casts only from the machine and the canopy; everything else does not cast.
3. The tilt-shift must not blur the bar or the key strip: it is a canvas pass only.
4. 375 px: the coin panel and the hatch stay big enough to tap (34 px targets), or a tap near the machine counts.
5. Bloom on the tube must not wash the moths out.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `bread/index.html`, the bean, the `toys.json` entry and the Lab menu `<li>` with its hook.

- [ ] Scene: machine, drum, canopy, tube, road, field, far land, sky. Lights: tube, warm face, moon. No motion yet.
- [ ] Post: K2 bloom, tilt-shift, grade.
- [ ] Camera at 1280 and 375 px.
- [ ] Bar v2 spec wired, with stub handlers.
- [ ] `toys.json` entry and a Lab `<li>` with an icon that reacts to the pointer.
- [ ] Stills at 1280 and 375 px. **Stop. Tom signs off the look.**
- [ ] Commit: `Broodautomaat: blockout`.

### Task 2: Coin, carousel and hatch

- [ ] Coin slot pick, coin drop and glint, drum turn with overshoot, hatch swing, loaf glow and steam.
- [ ] Take a loaf; empty compartments stay dark; Reset restocks.
- [ ] Commit: `Broodautomaat: coin, carousel and hatch`.

### Task 3: Tube, moths and cars

- [ ] Tube flicker and strike, end glow, Tube slider.
- [ ] Moth spirals, scatter, landing on sleep.
- [ ] Car pass with spot shadow, beam cones and tail lights; `+ Car`; auto cars.
- [ ] Commit: `Broodautomaat: tube, moths and passing cars`.

### Task 4: Rain

- [ ] Wet road mirror and streaks, rain lit only in the light.
- [ ] Commit: `Broodautomaat: rain on the road`.

### Task 5: Sound

- [ ] Hum, starter, coin, motor, hatch, car with Doppler, bed. Q9.
- [ ] Commit: `Broodautomaat: sound`.

### Task 6: Finish

- [ ] Settings persist, frame loop, sleep, ladder, reduced motion.
- [ ] Browser-pane checks from bar-v2.md section 6. Tick the bean. Commit.
