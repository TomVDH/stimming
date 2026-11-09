# Marsh launch (`launch`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Dawn over a reed marsh. Tap to launch a rocket from the far shore. Its light crosses the marsh at once; its roar arrives seconds later and lifts the birds from the reeds. High up, its plume catches the sun before the ground does.

**Architecture:** three.js 0.170 on the K2 scene from Fireworks, with K6 for sparks. A GSAP timeline on the sim clock runs each launch. Plume particles are lit by the flame and, above the Earth's shadow line, by the sun. Reeds are instanced blades.

**Tech stack:** three.js 0.170 (InstancedMesh, EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), GSAP 3.13, simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 55 in [toy-ideas.md](../toy-ideas.md); rank 17 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | M to L · $25 to $50 |
| Kits | Uses K2 and K6 from `fireworks/index.html` |
| Before the build | D1, and Fireworks built first |

## The shot

A flat marsh under a pre-dawn sky: deep blue above, a band of rose and amber at the horizon.
Reed beds in dark silhouette fill the foreground and sway; still channels between them hold the sky.
Low mist lies over the far flats. There is no tower and no pad: the Look rule cuts both. The far shore is one dark line.

## Hero moments

1. **The twilight plume.** Around T+25 s, the plume climbs into sunlight while the marsh is still in shadow. It blooms into a glowing, translucent bell of gold and blue against the dark sky. Real launches at dawn do this.
2. **Light now, sound later.** The ignition flash reaches you in silence. The roar arrives 3.5 to 10 s later, with its crackle.
3. **The birds lift.** When the sound wave arrives, a flock bursts from the reeds and wheels away. Cause, then effect, across the whole marsh.
4. **Flame light on the reeds.** As it climbs, the flame rims every reed head with orange, and the channels mirror a moving streak.
5. **Separation.** On Heavy, two boosters fall away as two small sparks with their own short plumes.

## Loop

- Tap or Launch: ignition on the far shore below the tap's x.
- A tap during a launch toggles the view: it eases up to follow the rocket, or back down to the marsh.
- One launch runs about 45 s, compressed four times from real time:

| Time | Event |
|---|---|
| T−3 s | Ignition flash. Steam billows sideways at the base. |
| T0 | Liftoff: slow for the first second, then faster. |
| T+8 s | Pitch-over: the gravity turn bends the path to the right. |
| T+18 s | Heavy only: booster separation. |
| T+25 s | The plume enters sunlight: the twilight bell. |
| T+40 s | The engine is a moving star. |
| T+60 s | The plume shears in the upper wind and fades. |

- Dawn moves the sun's depression from 9° to 1° below the horizon. That moves the shadow line, and with it the twilight effect.

## Bar

| Control | Content |
|---|---|
| Chips | Small, Medium, Heavy |
| Slider | Dawn |
| Action | Launch |
| Settings | Distance: Near, Mid, Far · Letterbox: Off, On · Quality: Standard, High (shared) |
| How | Click/Tap: launch · Drag: look around · Space: launch (mouse devices only) |

| Distance | Range | Sound delay |
|---|---|---|
| Near | 1.2 km | 3.5 s |
| Mid (default) | 2 km | 5.8 s |
| Far | 3.4 km | 9.9 s |

## Tech

**Earth's shadow line.** With the sun δ below the horizon, air above `h = R (1 / cos δ − 1)` is sunlit (R = 6371 km). At δ = 6°, h is about 35 km.
The scene maps real altitude to world height on a log scale, so 0 to 120 km fits the frame. Plume particles above h take sunlight.

**Plume.**

- Billboards emitted along the path history, up to 3,000 on High and 1,200 on Low.
- Each has a birth time, a position, an expansion rate that grows with altitude (thin air), and a shear from a wind that turns with height.
- **Lighting:** flame light near the engine (`uFlame`, as Night viaduct's `uArc`). Above the shadow line, sunlight: a gold core (0.85 0.12 75) with blue scattered edges (0.75 0.08 240). Below it, the dawn sky's ambient.
- **Ground steam:** 60 large billboards that billow sideways from the base in the first 8 s.

**Rocket.** A bright flame billboard with flicker, and a white core with bloom. K6 sparks shed from the base for the first 4 s. Boosters on Heavy are two K6-style sparks with short trails.

**Reeds.** Instanced thin blades, 12,000 on High and 5,000 on Low, in clumps. The vertex shader sways them with simplex waves.
Shading: dawn-sky ambient, plus a rim from `uFlame` on the side that faces it, plus a soft back-light from the horizon glow.

**Water channels.** Planes with K2 streak reflections: the sky gradient, the flame streak and a dim plume reflection.

**Birds.** 60 birds as small dark wing flecks with a two-frame flap. A light flocking rule: separation, alignment, and a pull toward a far point. They launch from the reeds when the sound front arrives.

**Sound front.** A ring expanding at 343 m/s from the pad, in compressed scene units. Its arrival at the camera triggers the roar. Its arrival at each reed bed lifts that bed's birds, so birds farther out lift first.

**Timeline.** `launch(kind)` returns a GSAP timeline on the sim clock, as in Coast and meteor. Paused timelines keep GSAP's ticker idle.

## Sound

- **Before:** a quiet marsh: reed rustle (high-passed noise following the sway) and an occasional bird chirp (a short FM chirp every 6 to 12 s).
- **The roar, after the delay:**
  1. It swells over 2 s: a broad noise band with a sub under 40 Hz.
  2. Crackle: random impulsive clicks, the signature of rocket noise.
  3. A low-pass falls from 4 kHz to 600 Hz over 30 s as the rocket climbs away.
- **Birds:** a wing flutter (amplitude-modulated noise) when they lift. Then the chirps stop for 10 s, as real birds go quiet.
- **Booster separation:** a faint double thud, after the delay.
- Follow the Delayed sound rules.

## Finesse

- The first second of liftoff is slow. Real rockets hang before they climb.
- The steam billows sideways before it rises.
- The twilight bell shows only when the sun is low: at Dawn 1° the whole sky is bright and the effect is weaker; at 6° to 9° it is strongest.
- The plume shears into a zigzag in the upper wind.
- Mist lights orange on the flame side while the launch is low.

## Reduced motion and idle

- **Reduced motion:** reeds still, a softer flash, the plume grows without shear, and birds fade up and away instead of flocking.
- **Idle:** reeds drift. It runs at 30 fps when drifting and sleeps 60 s after the last input. A launch in flight keeps it lively.

## Review focus

1. **Tap during a launch:** it toggles the follow view and never starts a second launch. The Launch button carries `aria-disabled` until the plume fades.
2. **Hidden tab mid-launch:** the timeline pauses and the pending roar cancels. On return the roar is rescheduled from the timeline.
3. **Dawn moved mid-launch:** the shadow line moves live, so the plume's lit part changes. That is fine, but it must not flicker.
4. **375 px portrait:** the camera tilts up, so the full climb to T+40 s stays in frame.
5. **Mute during the delay:** the roar never plays, and the birds still lift.

## Tasks

### Task 1: The marsh at dawn

**Files:** Create `launch/index.html` and the bean.

**Produces:** marked `K2` and `K6` from Fireworks; `reeds` (InstancedMesh); `dawn(δ)`, which sets sky, sun and shadow line; `shadowH(δ)`.

- [ ] Lift K2 and K6. Build sky, mist, reeds, channels and the far shore line.
- [ ] Q1, Q2 and stills at three Dawn values, at 1280 and 375 px. Checkpoint with Tom.
- [ ] Commit: `Marsh launch: the reed marsh before dawn`.

### Task 2: The launch

**Produces:** `launch(kind)` returns a timeline; `uFlame`; `plume`.

- [ ] Flame, steam, trajectory, plume particles with the shadow-line lighting, reed rim light, channel streaks and boosters.
- [ ] Screenshots at T0, T+8 s and T+25 s. Checkpoint with Tom: the twilight bell.
- [ ] Commit: `Marsh launch: liftoff and the twilight plume`.

### Task 3: Sound front and birds

- [ ] The sound front ring, the birds, and the quiet after.
- [ ] Commit: `Marsh launch: the sound front lifts the birds`.

### Task 4: Sound

- [ ] Marsh bed, roar, crackle, wings and the booster thud, with delays. Q9, and the mute test from Review focus 5.
- [ ] Commit: `Marsh launch: a roar that arrives late`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

`shadowH(δ)` and the sunlit-plume shading, marked. Any dawn or dusk toy with high smoke can copy them.

## Bokeh on BokehShader2 (12:30, Tom: grainy and vague)

Cause: 22 golden-angle taps turned per pixel on thin reeds read as fizz; the eight-probe dilation pushed the fizz a cap radius into the sky, where the one-sided reach let one or two taps count.
Fix: the pass is three.js's `BokehShader2`, patched by string: a near-only blur in dioptres (`uK`, `uCapPx`), the widest blur among eight fixed probes, no tone map mid-chain. Fixed ring taps: Standard 5 x 4 (60), High 6 x 5 (105), rung 2 and under 3 x 3 (18); `depthblur` on; no noise.
Defaults: 80 px per dioptre, cap 13 px per 800 px. The hunt scales the near blur and cap, never the distance.
Settings: Bokeh is Round or Pentagon. The Texture row and the Hex, Oval, Donut and Star shapes are gone (no equivalent in the addon).
QA hooks on `window.__qa`: `dawn(v)`, `simT()`, `flightT()`, `jump(t)`.

## Calm camera (12:40, Tom: the camera twitches)

Cause: a fresh random offset on yaw and pitch every drawn frame, an exposure flicker every frame, and a 24 fps gate on a 60 Hz screen (a 2-3-2-3 cadence).
Fix: the jitter and the flicker are gone; the three-sine wobble and the launch shake stay. The film runs at 30 fps (an even cadence); the grain reseeds every second frame. Ladder threshold 50 ms. `__qa.draws()` counts frames; measured 30.0 fps in the pane.

## Rocket sharp through the zoom (12:45, Tom: the rocket went soft on the toggle)

Cause: the focus hunt added blur to every pixel for 1.3 s on each toggle.
Fix: the hunt scales the near blur and its cap only; far pixels have zero blur by the one-sided model. In flight the focus distance is the smaller of the pad and the rocket's distance, so the rocket never sits beyond the focus.

## The arc stays in frame to SECO (13:00, Tom: the rocket must complete its trip to orbit)

Cause: downrange 1.1 D left the frame near T+60; the body hid at END-6.
Fix: `rocketAt` works from the eye: `lensReach()` gives the sky's elevation span and the frame's half-width for the unzoomed lens; elevation climbs to 0.78 of the span (square root of altitude), azimuth sweeps to 0.8 of the half-width, the rocket recedes to 2.2 x the pad distance. Past T+70 the track flattens and sinks 18%: insertion. The body stays to END, sunlit above the shadow line (`uBodySun`), and fades over the last 8 s. `done: false` is set on the flight, so GSAP's set at END is a plain property. Checked at T+30, 60, 90, 115 (1280) and 60, 115 (375): in frame every time.

## Living reeds (13:15, Tom: more realistic dynamic sway, a cleaner model)

Wind: one mean direction (`WIND`), a gust strength per point (`gustAt`: an 80 m envelope for lulls and gusts, 16 m fronts, both carried along the wind at 4 m/s). The banks keep `gust()` as a sideways push from the same field.
Stalk: a length-keeping bend; the tangent turns by th * u^2 (`stalkAt`, `stalkTan`, small-angle series). th = lean + 0.06 H g + sway + the sound front. Sway is a sine at 4.5 / sqrt(H) rad/s (tall stalks swing slower), amplitude 0.03 to 0.12 rad with the gust, plus a smaller cross-wind sine.
Leaves: three, alternating sides at nodes 0.3, 0.5, 0.7 H, lengths 0.36 to 0.26 H, a 5 to 8 Hz flutter that grows in a gust. Plume: 0.2 H panicle, 35 degrees off upright, nodding 0.5 rad behind the stalk at 1.6 x the amplitude. Taper 8 mm to 3 mm. Named constants head the shader.

## Birds near the eye (13:45, Tom: closer to the POV, spruced up)

Beds sit 30 to 220 m out, left or right of the lane to the pad (`seedBirds`). The three near beds break sideways and low, wheel inside the lens for ten seconds (goal 18 m to their side, 17 m up, 40 m out), then pass the eye on their side; speed cap 9 m/s. Far beds keep the far point.
The bird is drawn: a continuous wingbeat on the flap phase (wrist leads the tip), tapered wings, body, head, notched tail; 0.9 m span, never under six pixels. Colour has a floor (0.05 linear) so a bird reads against a black sky; the dawn glow warms it.
QA: `__qa.birds()` lists airborne birds; the headless harness must wait in real time (`--wait`), since a clock jump lifts every bed at once.

## No launch shockwave (13:55, Tom: a shockwave hits the POV and jitters it)

Gone: the camera shake tweens at ignition, liftoff and roar arrival, and the reed push wave (`uFront` stays at zero; the shader path remains for later). The camera keeps only its slow handheld wobble. The birds still lift as the sound front reaches each bed, and the roar still arrives late in the sound.

## Reed plumes trimmed (14:10, Tom: the reeds still look a little weird)

Cause: the panicle ran to 0.26 of the stalk and hung 35 degrees plus the stalk's lean, so each hero reed read as a palm frond blown flat; the near-field blur made blobs of them.
Fix: panicle 0.08 to 0.14 of the stalk (`PLUME_LEN` 0.11), held 12 degrees off the stalk's top (`PLUME_DROOP` 0.22) with the tip drooping; gust bend 0.035 H and the top angle capped at 0.45 rad; plume lag 1.3 x. Compared against the pre-rewrite build served from `5fb0a40` at Dawn 0.9.

## Rename and icon spike 28 (14:30, Tom: less overt, less literal)

The toy is now Ten seconds (`toys.json`, menu label, page title, intro fallback, h1). Dutch set to Tien tellen /tin ˈtɛlən/ as Tom's draft pick; he confirms. The folder stays `launch`.
Icon spike 28 (`icons/spike-28.html`, sheet entry `[28, ['launch']]`): Current (the sky box) and three directions with no rocket drawn. A Slant: a gold streak from the corner with a hot square head. B Rim: a hex, a dawn hairline, a dot that brightens the line as it climbs. C Ring: a sound ring from the horizon that leans three brut reeds as it passes. Emblems in `icons/spike/emblems/launch28-a..c.svg`. Tom picks; the menu tile follows in the next commit.

## Icon spike 29 (14:50, Tom: round 1 was clip art, too like the other tiles)

Round 1's symbols on a dusk box resembled the landscape tiles. Round 2 follows what Tom picked elsewhere (Fireworks A, Dijkstra A, Vortex D, Ink, Oil slick, Foil, Sonar): a live miniature of the toy's own phenomenon, drawn by code, steered by the pointer. No horizon box, no ring.
A Twilight plume: 46 puffs along a bent path, cold below the shadow line, gold and rose above it; pointer y is the Dawn slider. B Reed bed: 120 seeded stalks with plume wedges; a speck flashes, a beat later a wave leans every reed away. C Late shadow: the kit's own block; the face flashes, ten ticks count, the hard shadow kicks loose and judders back. D Ground cloud: 36 billows blast out along the ground from a hot core, lit from within, then darken; pointer x is the wind.
GSAP cannot tween `oklch()` strings (ticks turned teal), so colours are set, never tweened; the flash is a white sheet whose opacity tweens.

## Menu tile: Twilight plume (15:05, Tom's pick: spike 29 A)

The Lab tile is spike 29 A, drawn by the menu script from the same seeded stream as the spike: 46 puffs, a cold and a lit body each, the shadow line on pointer y, a sweeping dawn on focus or the play loop. Emblem copied to `shared/emblems/launch.svg` and set in `toys.json`. `icons/picks.json` records the pick and that spike 28 was cut.

## Icon spike 31 (15:20, Tom: more stylised before settling)

The twilight plume (spike 29 A, now the tile) in five print styles, each with pointer y as the Dawn slider: B Stencil (a three-ink cut-out: cream plume on ink blue, gold over it above the line, a rose bleed at the line), C Line (one-weight scalloped contour, dashed rule, gold hatching above it), D Isometric block (a marsh slab with a stack of discs that turn gold), E Abstract mark (a slanted bar and a slit), F Halftone (a dot grid sized by plume coverage, gold above the line, as the Vortex F3 emblem is). Emblems `launch31-b..f.svg`.

## Icon spike 32 (15:35, Tom: reeds, trail and spark; bright and iconic)

Rounds 2 and 3 were too oriented on the launch alone. Round 4 is one composition in four print styles: a bold reed fringe across the foot (26 stalks with plume heads, one cut-out), a trail that climbs from behind it and bends right, a spark at its head. Hover launches: the trail draws, the spark rides it; pointer y sets the climb.
A Poster: four flat bands of sky from ink blue to a gold horizon, cream trail, four-ray star. B Halftone poster: the dawn as a dot gradient, dotted trail, a disc with ray dots. C Line: one weight of white line, gold rule, dashed trail, eight-ray burst. D Riso: two fluorescent inks on cream paper, the orange plate off register, paper grain. Emblems `launch32-a..d.svg`.

## Icon spike 33 (15:50, Tom: less stylised, better fidelity, an ascent plume)

Round 5 keeps round 4's composition (near reed fringe, far reed bed, trail, spark) and replaces the trail with a real exhaust column: 52 puffs along the climb, each a cold body, a lit body and a rim toward the light, softened by a small blur; a dusk gradient sky with a horizon glow and a mist band; a flame and a glowing spark at the head. Hover launches: puffs appear up to the head and grow as they age; pointer y sets the climb.
A Ascent, dawn (sunlit above the shadow line). B Ascent, night (stars, flame-lit column). C Ascent, first sun (pale sky, all sunlit, violet reeds). One shared emblem: lit puffs white, cold grey, reeds white.
