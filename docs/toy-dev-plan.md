# Development plan: the first four toys

Tom chose the ranked top four from [toy-plan.md](toy-plan.md) on 2026-11-04.
Build each toy in its own fresh session, in this order. Open the session with:

> Build **<toy>** from `docs/toy-dev-plan.md`: read the ground rules and the toy's section, then follow the process.

| Order | Toy | id | Size | Estimate | Builds |
|---|---|---|---|---|---|
| 1 | Night viaduct | `viaduct` | M to L | $35 to $50 | K2, the night scene |
| 2 | Star trails | `trails` | S | $10 to $15 | K1, the fading-trail buffer |
| 3 | Sonar | `sonar` | M | $20 to $30 | CRT pass; reuses K1 |
| 4 | Cloud chamber | `chamber` | S to M | $12 to $20 | reuses K1 |
| | **Total** | | | **$77 to $115** | |

Tom moved Night viaduct to first on 2026-11-04. If it costs more than $50, stop and rescale [toy-plan.md](toy-plan.md) before Star trails.

## Ground rules

### Look (Tom, 2026-11-04)

Relative minimalism blended with realistic, sweeping light. Shapes stay simple and few; light, haze and glow carry the scene.
No props, no fussy detail, nothing skeuomorphic. Cut any object that is only there to say what the place is.

`AGENTS.md` is the house spec. This section is what a new toy needs from it.

### Files

| File | Change |
|---|---|
| `<id>/index.html` | New page. Copy the skeleton from `pop/index.html`, the reference port. |
| `toys.json` | New entry: `name`, `number: null`, `sub: "Stimming Lab"`, `emblem: null`, `sound: true`. Draft `nl` and `ipa` for Tom to review. No motto. |
| `index.html` (menu) | One Lab `<li>` (pattern near the top of `section.lab`) with a placeholder angular brut SVG icon and a `toys.<id> = { play, rest }` GSAP hook. The hook is required: the menu calls it for every Lab entry without a guard. |
| `.beans/` | One `feature` bean per toy, committed with the code. |

All four start in the Lab (`?lab`). Tom moves a toy to the main shelf and adds `data-done`.

Commit `index.html` through a private index: `GIT_INDEX_FILE=/tmp/<id>.idx git read-tree HEAD`, then `git apply --cached` of your hunks only. Check that the menu script parses before you push.

### Page

- **Head:**
  - `color-scheme: dark` plus an inline `html{background:oklch(...)}`
  - viewport with `viewport-fit=cover`
  - Gabarito, `../shared/stim.css`, `../shared/intro.css`
- **Body:**
  - `.intro` div
  - `.wrap > header[data-shell]`
  - `main > .stage.stage--<id>`, with a canvas carrying `tabindex=0`, `role=application` and an `aria-label`
  - a `.fail` notice for no WebGL2
- **Bar:**
  1. `.choices` chips, with `aria-pressed`
  2. one slider
  3. at most three actions
  4. Settings (the `#setBtn` plus `div.sets` pattern in `prism/index.html`)
  5. `dl.how`, at most four rows
- **About:** `section.about` with `h1.display`, and a `.vignette` kept `hidden` until Tom asks for one.
- **Importmap:** the AGENTS.md block, word for word.
- **Wiring:**
  1. `playIntro({ ready })` from `../shared/intro.js`
  2. `initPage({ id })` from `../shared/stim.js`
- **Reuse from `shared/stim.js`:** `fitCanvas`, `whenVisible`, `reduced` and `onReducedChange`, `choices`, `audioKit` with `kit.tone()`, `linFit` and `css`.

### Behaviour

- **Loading:** `ready` includes shader compilation and one first frame, so no compile work lands after the intro clears.
  - three.js: `await renderer.compileAsync(scene, camera)`, then one render.
  - Raw WebGL: one draw, then `gl.finish()`.
- **Sound:** Tone nodes connect to `kit.out`, as in `pop/index.html`. Muted by default; a gesture starts it; the context suspends when idle.
- **Frame rate:** 30 fps or better.
- **Idle:** no per-frame work when the page is hidden or idle.
- **Reduced motion:** respected.
- **Comments:** ASD-STE100.
- **Stage:** no copy on it.
- **Names:** no brand names.

### Rendering bases

- **Star trails, Sonar, Cloud chamber:** raw WebGL2, following `scope/index.html`.
  - `target()` makes RGBA16F framebuffers.
  - `decayPass` ping-pongs with `exp(-dt/τ)`.
  - `whenVisible` stops the loop.
- **Night viaduct:** three.js 0.170, following `snow/index.html` (EffectComposer, RenderPass, UnrealBloomPass, OutputPass, snow points). It also uses the sky keyframes and shader haze from `walker/index.html`.

### Process

1. `git pull --ff-only`. Create the bean; keep its checklist current.
2. Build in this order: stage and render, interaction, bar, sound, then the menu entry and `toys.json`.
3. Send Tom screenshots at each checkpoint. Tom answers in batches.
4. QA, then commit one logical change at a time and push.
5. Write the real session cost into the bean.

### QA

The repo has no test tooling. Use a throwaway Playwright script outside the repo.

1. Serve with `python3 -m http.server 8000`. Open `/<id>/` and `/?lab`.
2. The console is clean on the toy and on the menu, including when you hover the new Lab icon.
3. Drive the main gesture and every chip and action.
4. Take screenshots at 1280px and 375px.
5. Count fps. Headless Linux uses SwiftShader, so its number is a floor; Tom checks on a real device.
6. Check that reduced motion and a hidden tab stop the frame loop.
7. Run `node --check` on the module scripts, and check that the menu script parses.

## 1. Star trails (`trails`)

**Scene:** a night sky over a black dune ridge with marram grass and one warm tent glow. The sky has an airglow band at the horizon, a faint Milky Way and film grain.

**Loop:**
- Hold to open the shutter: the stars sweep arcs around the celestial pole.
- Release to close it.
- Trails fade slowly (τ about 20 s), so exposures stack.
- Now and then a meteor or a blinking aircraft crosses as a straight or dashed streak.

**Bar:**

| Control | Content |
|---|---|
| Chips | North (Polaris inside the arcs), South (no pole star), Equator (near-straight lines) |
| Slider | Exposure: how long trails last |
| Action | Clear |
| Settings | Star count, true colour or mono, meteor chance, foreground on or off |
| How | Hold: open shutter · Release: close · Space: shutter (mouse devices only) |

**Tech:**
- About 4,000 stars on a power-law magnitude scale, coloured by temperature with `linFit`.
- Each frame draws each star as an instanced capsule from its previous angle to the new one, with additive blending into an RGBA16F accumulation target. That gives continuous arcs at any frame rate.
- The decay pass ping-pongs.
- The composite adds the sky gradient, the accumulation, live twinkle, a foreground silhouette (a noise SDF), grain and a vignette.
- **K1:** keep accumulation and decay in one marked section, so Sonar and Cloud chamber can copy it.

**Sound:**
- a soft shutter click on press and on release
- a low pad whose filter opens with the exposure
- a faint tick for each meteor

**Reduced motion:** no twinkle. Holding draws the full arcs at once.

**Idle:** the loop stops when the page is hidden, or when the shutter is closed and the trails have faded.

**Checkpoint:** one screenshot of a long exposure at 1280px.

## 2. Sonar (`sonar`)

**Scene:** military realism. A red low-light phosphor CRT fills the stage: red is the only colour, as on a darkened submarine console. It has a light barrel curve, scanlines, a soft glow, grain and a slight flicker. No bezel. (Tom, 2026-11-04)

**Active mode (round display):**
- A sweep line turns.
- Tap to ping: a ring spreads out, and each contact it crosses blooms as a blip, then fades with the phosphor.
- Drag to move the boat, so the contacts drift.
- The contacts:
  - a noise-shaped seabed
  - a wreck: strong and long
  - a fish school: a cloud of weak returns
  - a whale: it moves, and sings on the sonogram
  - a rare odd contact: large, slow, then gone

**Sonogram mode (passive waterfall, a main mode):**
- Frequency runs on x; time scrolls down.
- Whale song shows as rising curves, a far propeller as steady tonal lines, sea noise as speckle.
- Tap to knock the hull, which shows as a broadband stripe. This is the Spectrogram, idea 54.

**Bar:**

| Control | Content |
|---|---|
| Chips | Active, Sonogram |
| Slider | Range |
| Actions | Ping, Shuffle (a new sea) |
| Settings | Persistence, curvature, scanlines, sweep speed |
| How | Tap: ping or hull knock · Drag: steer · Space: ping (mouse devices only) |

**Tech:**
1. **Excite:** draw the sweep wedge and the ping ring into the phosphor buffer. Contacts come from a uniform array (up to 32); the seabed is a noise function.
2. **Decay:** copied from K1.
3. **Waterfall:** each frame writes one 512-bin row with `texSubImage2D` into a wrap-scrolled texture.
4. **CRT composite:** barrel curve, mask, scanlines, a half-resolution glow, grain. Keep it as one block that other toys can reuse.

**Waterfall data:** a procedural model of the same sources the audio plays. An AnalyserNode would go blank when muted, because mute suspends the audio context.

**Sound:**
- the ping: a 1.5 to 3 kHz sine burst with reverb
- one echo per contact, delayed by its distance, filtered and quieter
- a bed of low-passed brown noise, FM whale glides and a quiet propeller hum

**Reduced motion:** a slow sweep, no flicker, no moving grain, and the ping ring jumps in steps.

**Checkpoints:** an Active screenshot and a Passive screenshot, then a listen-through of the ping and echo with Tom.

## 3. Cloud chamber (`chamber`)

**Scene:** black velvet raked by side light, with faint alcohol mist drifting. Tracks form as thin white condensation lines that widen a little, drift and fade in 2 to 3 s.

**Tracks:**
- Alpha: short, thick and straight.
- Beta: thin, long and wiggly.
- Muon: long, straight and thin; it crosses the whole view, and is rare.
- Delta-ray kinks now and then.
- With the magnet on, paths curve and slow electrons spiral.

**Bar:**

| Control | Content |
|---|---|
| Chips | Cosmic (background only), Mantle (a thoriated lantern mantle: alpha bursts), Beta |
| Slider | Magnet |
| Action | Shower: a cosmic-ray air shower, dozens of parallel tracks |
| Settings | Activity, mist density, light angle, track life |
| How | Tap: place source · Drag: stir the mist · Space: shower (mouse devices only) |

**Tech:**
- The CPU makes each track as a polyline: a random walk with scattering per particle type, and Lorentz steps when the magnet is on.
- Tracks are drawn as soft instanced quads into a fresh-condensation buffer.
- A mist pass advects that buffer through a slow curl-noise velocity field (semi-Lagrangian, light diffusion), plus the K1 decay. Dragging adds a velocity splat.
- The composite adds the raking light, mist noise and grain.

**Sound:** a soft tick per track (not a harsh Geiger click), a faint hiss bed, and a clatter for the shower.

**Reduced motion:** no mist advection. Tracks fade in place.

**Checkpoint:** one screenshot of Mantle with the magnet at half.

## 4. Night viaduct (`viaduct`)

**Shot:** a wide, still frame of a snowy valley at night.
- A stone viaduct of many arches crosses it, with moonlit rims and snow caps.
- Village lights sit far below, mist pools in the valley, and the moon is behind thin cloud.
- A short electric train with warm windows crosses. Its headlight cuts through the snow, and pools of window light slide over the ground below.
- Now and then the pantograph arcs and lights the snow blue for a moment.
- Stylised, not photoreal. The camera breathes slowly, and the pointer adds a little parallax.

**Bar:**

| Control | Content |
|---|---|
| Chips | Light snow, Blizzard, Clear (stars) |
| Slider | Time: dusk to midnight |
| Action | + Train (direction alternates) |
| Settings | Train length, letterbox, quality (bloom resolution, snow count) |
| How | Tap: send a train · Hold: slow time · Drag: look around · Space: train (mouse devices only) |

**Tech (three.js 0.170):**
- **Viaduct:** piers and arch spans from `ExtrudeGeometry` (a shape with arc holes), merged into one geometry. Snow caps come from the shader, by how far each surface faces up.
- **Terrain:** a plane displaced with simplex noise, under a snow shader.
- **Train:** a few boxes. A canvas-drawn window texture has per-window flicker.
- **Headlight:** an additive cone mesh. Snow inside the cone lights up in its shader, so there is no SpotLight.
- **Window pools:** projected quads that move with the train.
- **Snow:** about 8,000 points with wind and depth size, lit by uniform arrays for the headlight, windows and arc flash.
- **Haze:** height haze in shader code, as in `walker/` (the repo does not use `THREE.Fog`).
- **River:** fake reflections, as vertical streaks for lit things only.
- **Post:** RenderPass, half-resolution UnrealBloomPass, a grade pass (haze tint, vignette, grain), then OutputPass.
- **K2:** keep sky, haze, snow, bloom and grade as marked sections, so Fireworks and Wind farm can copy them.

**Sound:**
- a far rumble that swells and pans with the train
- a rail-joint rhythm: noise bursts timed by wheel spacing
- a muffled wind bed
- a crackle on each arc
- a far two-tone horn

**Reduced motion:** slow snow, no camera breathing, a soft arc flash.

**Checkpoints:**
1. **Blockout:** still screenshots of composition and lighting, before any motion or sound.
2. **Motion and sound** review.
