# Window seat (`windowseat`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The night side of the Earth slides past below you from orbit. Storms flicker inside the clouds, and you hear the lightning as radio.

**Architecture:** One full-screen fragment shader does the whole planet analytically: ray to sphere for the ground, a cloud shell and two airglow shells. three.js 0.170 is only the host, for the composer and the bloom. The city lights come from a texture, and storms are a small CPU list of flash sources.

**Tech stack:** three.js 0.170 (EffectComposer, ShaderPass, UnrealBloomPass, OutputPass), Tone.js through `kit.tone()`.

**Spec:** shortlist 56 in [toy-ideas.md](../toy-ideas.md); rank 6 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M to L · $25 to $50 |
| Kits | none |
| Before the build | D2: Tom approves the two image files. |

## The shot

No window frame and no cabin: the Look rule cuts both. The limb of the Earth curves across the upper third.
Above it lie black space, steady stars and the thin green airglow line. Below it, city lights run in orange threads and white cores under dark, moonlit cloud.
The ground drifts slowly, as in a time-lapse from orbit.

## Hero moments

1. **Storms seen from above.** Flashes bloom inside cloud tops and hop from cell to cell along a squall line. Now and then a red sprite flickers above the biggest flash for 120 ms.
2. **Lightning as radio.** Space carries no thunder. Each stroke is a sferic click, and one in five is a whistler, a falling tone of about a second.
3. **Dawn.** The sun crests the limb. A thin band runs red, orange, white, then blue above. The city lights fade under the glare, then the next night pass begins.
4. **Cities through cloud.** Clouds over a city glow orange from below.

## Loop

- Drag sideways: the ground speeds up, stops or runs back, with inertia. On release it eases back to cruise over 3 s.
- Drag up and down: the view tilts between more limb and more ground, within limits.
- Tap: lightning in the cloud nearest the tap, which chains to its neighbours. Above the limb, the nearest cloud on the limb flashes.
- A route chip flies to a new track. The view dips to black for 0.4 s, then fades in over 0.6 s.

## Bar

| Control | Content |
|---|---|
| Chips | Europe, Nile, Gulf, Japan, East Coast |
| Slider | Moon: new to full; it sets the cloud tops' silver and the glint on the sea |
| Actions | + Storm, Dawn |
| Settings | Clouds: Few, Some, Many · Airglow: Off, On · Quality: Low, High |
| How | Drag: drift and tilt · Click/Tap: lightning · Arrows: drift (mouse devices only) · Space: storm (mouse devices only) |

| Route | Start, heading | What passes |
|---|---|---|
| Europe | 54° N 2° E, south-east | The Randstad, the lit motorways of Belgium, the Rhine, then the dark Alps |
| Nile | 24° N 33° E, north | One bright thread in a black desert, opening into the delta's fan |
| Gulf | 27° N 49° E, east | Gas flares, coastal cities, then dark sea |
| Japan | 37° N 127° E, east | Seoul, then squid fleets as bright points at sea, then Japan |
| East Coast | 36° N 78° W, north-east | Washington to Boston as one unbroken chain of light |

## Tech

**Assets (D2):**

- `windowseat/lights.webp`: 4096 × 2048, grey, about 1 MB, from NASA Black Marble. Load it with mipmaps.
- `windowseat/land.png`: 2048 × 1024, one bit, about 100 KB, from Natural Earth.
- `ready` waits for both decodes. Past 9 s, show `.fail`: "Window seat could not load its map."

**The planet shader.** Units are km, with R = 6371 and the camera at 420 km. A rotation matrix `uEarth` turns Earth-fixed coordinates as the track advances.

| Layer | Method |
|---|---|
| Ground | Ray to sphere. Look up lights and land at the lon and lat of the normal. Lights map to colour by brightness: sodium orange (0.72 0.15 60), with white cores (0.95 0.03 85) above 0.6. Land takes faint moonlight; sea takes a moon glint. |
| Clouds | A shell at R + 12 km. 3D fbm with domain warp, 5 octaves on High and 3 on Low, drifting slowly. Lit by the moon from above, and from below by `textureLod(lights, uv, 4.0)`. |
| Airglow | Two shells, integrated over 12 steps near the tangent point: green (0.7 0.17 145) at 95 km, σ 8 km; faint red (0.5 0.15 25) at 250 km, σ 40 km. |
| Stars | Hashed on the view direction, as Night viaduct's sky does. No twinkle: there is no air to bend the light. |

**Storms.**

- Up to 16 cells, each with a position, a radius, a next-flash time and its neighbours.
- A flash is 2 to 5 strokes, 40 to 120 ms apart. Each stroke rises in 5 ms and decays in 80 ms.
- A flash sets off a neighbour within 150 km, with probability 0.4, within 300 ms.
- Up to 8 active flashes go to the shader as uniforms. Each one lights cloud density, with its own fbm offset so no two flashes look alike.
- **Sprite:** 4 % of the strongest flashes. A red (0.6 0.2 20) jellyfish shape 60 km above the cloud, for 120 ms.

**Dawn.** A 9 s timeline on the sim clock:

1. The limb band grows from red to white over 6 s.
2. The sun disc clears, and bloom makes the flare.
3. Cloud tops near the terminator catch pink light, and exposure drops so the cities fade.
4. After a 2 s hold, the view dips to black and the night pass comes back.

**Drift.** The track angle advances at cruise speed ω = 0.0068 rad/s (a time-lapse of about six times). Drag adds velocity, clamped to ±5 times cruise.

## Sound

- **Cabin bed:** the station is never quiet. Brown noise below 400 Hz at −30 dB, plus two hums at 117 and 121 Hz at −40 dB, while lively only.
- **Sferic:** each stroke is a 3 ms click through a 5 kHz bandpass, panned by screen x.
- **Whistler:** one flash in five. A sine glides down from 7 kHz to 1.5 kHz over 1.2 s, with a second, quieter partial. It starts 0.3 s after the click.
- **Dawn:** a slow open-fifth pad that swells and fades with the light.

## Finesse

- Stars hold steady; airglow sits as a thin line, not a halo.
- Belgium's motorways read as orange lines on the Europe route.
- Clouds glow over cities from below. The moon glint slides over the sea as you drift.
- Cloud tops move a little faster than the ground, which gives parallax from height.
- The first frame is the Europe route already in mid-drift, with one storm cell flickering.

## Reduced motion and idle

- **Reduced motion:** no drift. A tap gives one soft flash, not a chain. Dawn cross-fades instead of sweeping.
- **Idle:** this toy drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input.

## Review focus

1. **Assets slow or missing:** a cold cache on a slow line must not leave a black stage. `ready` holds the intro, then `.fail` shows.
2. **375 px portrait:** the limb still crosses the frame. The camera pitch changes with aspect, and the limb sits at 78 % of the height.
3. **A route chip during Dawn:** Dawn ends at once, and the new route fades in at night.
4. **A hard fling:** inertia clamps at five times cruise; it never spins the planet.
5. **Low-end GPU:** fbm clouds are the cost. The ladder drops octaves from 5 to 3 before the pixel ratio.

## Tasks

### Task 1: The planet at rest

**Files:** Create `windowseat/index.html`, `windowseat/lights.webp` and `windowseat/land.png`. Create the bean.

**Produces:** the `PLANET_FS` shader; `uEarth` (mat3); `setRoute(name)`.

- [ ] Fetch the assets. If the session cannot reach NASA or Natural Earth, ask Tom to drop the files in.
- [ ] Ground, lights colour, land, airglow and stars. No clouds yet.
- [ ] Q1 and Q2, plus stills of Europe and Nile at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Window seat: the night side from orbit, lights and airglow`.

### Task 2: Drift, routes and clouds

- [ ] Track rotation, drag inertia and tilt, the routes table, and route fades.
- [ ] The cloud shell, with moonlight and the glow from below. The Moon slider.
- [ ] Q4: drifting at 32 fps or fewer; asleep after 62 s.
- [ ] Commit: `Window seat: drift, five routes, moonlit clouds`.

### Task 3: Storms, sprites and dawn

**Produces:** `storm(cellCount, at)`, `flash(cell)`, `dawn()`.

- [ ] Cells, flashes, chains, sprites and tap picking. Then the Dawn timeline.
- [ ] Screenshots of a storm chain and of dawn at its peak. Checkpoint with Tom.
- [ ] Commit: `Window seat: storms seen from above, sprites, dawn`.

### Task 4: Sound

- [ ] Cabin bed, sferics, whistlers and the dawn pad. Q9.
- [ ] Commit: `Window seat: lightning heard as radio`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. The vignette credits NASA and Natural Earth. It stays `hidden` until Tom asks; the credit text waits in its markup.
- [ ] `toys.json` and the menu Lab entry with an icon and a hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

None. The analytic planet shader and the airglow sit in marked sections, in case Observatory or Fjord aurora ever come up.
