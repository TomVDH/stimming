# Frietkot (`frietkot`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A chip shack stands alone on an empty village square late at night. Drop fries into the fryer, shake the basket, and watch the steam roll out through the lamplight.

**Architecture:** three.js 0.170. The shack, the square and the far houses are a few boxes under `MeshStandardMaterial`. The service window is a `RectAreaLight`, so its pool and its streak on the damp cobbles come from one light. Shader volumes add the light shaft and the steam. Post: bloom, a tilt-shift blur, then the K2 grade.

**Tech stack:** three.js 0.170 (EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, RectAreaLightUniformsLib), Tone.js through `kit.tone()`.

**Spec:** the Belgian night series (Broodautomaat, Frietkot at night, Lit motorway, Beer pour, Chocolate tempering); batch rules in [README.md](README.md); Bar v2 in [bar-v2.md](bar-v2.md).

| | |
|---|---|
| Size, estimate | M · $25 to $40 |
| Kits | K2 bloom and grade, lifted from `canal/index.html` |
| Before the build | nothing |
| Bean | `stimming-9f37` |

## The shot

One lit stop in a vast dark place. A low, wide lens stands on the cobbles about 14 m out.
The shack sits a little right of centre and takes about a fifth of the frame width. The sky and the empty square take the rest.
The far side of the square is a row of dark gables with two or three late windows. A church tower is a faint shape against the sky glow.
Warm light pours from the service window onto the cobbles. A neon strip runs along the roof edge, with a neon cone glyph on the roof box.
A tilt-shift blur turns the whole square into a model on a table: sharp at the shack, soft at the top and the bottom of the frame.

No text, no signs with words, no brands. The roof box is a light box with the glyph only.

## Hero moments

1. **The drop.** Fries hit the oil. The oil boils up hard in a white foam, the window flares, and a burst of steam rolls out under the awning.
2. **The shake.** The basket rattles; a dense cloud tumbles out of the window, glows gold in the light shaft, turns grey in the dark, and drifts off in the wind.
3. **The cone.** A paper cone fills on the counter. The sauce drops on top in its own colour, with one glossy highlight.
4. **Life at the edge.** Moths spiral round the neon. Now and then a scooter crosses the far side of the square; its headlight sweeps over the cobbles.

## Loop

- Tap the shack, or press Drop: a basket of fries goes into the oil.
- Hold on the shack, or press Shake: the basket shakes while held.
- Fill: the fries go into a paper cone with the picked sauce.
- Drag on the square: look round a little (parallax, within a few degrees).
- Untouched, the neon hums and flickers, the oil simmers, a thin steam plume rises from the roof vent, and the moths circle.

## Bar (Bar v2)

| Slot | Control | Content |
|---|---|---|
| Top left | Choice: Sauce, `stepper` (seven options), each with a colour dot | Mayonnaise, Andalouse, Samurai, Stoofvlees, Curry ketchup, Tartaar, Pickles |
| Bottom left | Actions | Drop (`F`), Shake (`S`), Fill (`C`) |
| Bottom right | Slider | Wind |
| Bottom centre | Keys | `[CLICK] drop fries` · `[HOLD] shake` · `[DRAG] look round` |
| Settings | Rows | Neon: Red, Blue, Green (choice) · Tilt-shift (slider) · Traffic (toggle) · Moths (toggle) · Quality (shared) |
| Settings footer | Reset | Empties the fryer and the counter; wind and sauce return to the start |

Five visible controls: Sauce, three actions, Wind.

| Sauce | Colour (OKLCH) | Gloss |
|---|---|---|
| Mayonnaise | 0.93 0.05 95 | High |
| Andalouse | 0.72 0.13 50 | High |
| Samurai | 0.66 0.17 38 | High |
| Stoofvlees | 0.34 0.06 45 | Low, chunks |
| Curry ketchup | 0.5 0.17 28 | Medium |
| Tartaar | 0.88 0.04 120 | Medium, flecks |
| Pickles | 0.78 0.15 92 | Medium, chunks |

| Neon | Gas, colour | Strip OKLCH |
|---|---|---|
| Red | neon | 0.66 0.24 28 |
| Blue | argon and mercury | 0.62 0.17 255 |
| Green | argon and mercury, green phosphor | 0.8 0.2 145 |

## Physical details

- **Double fry.** Belgian fries cook twice. The first drop blanches at about 150 °C: a hard boil, then gentle bubbles, and pale fries. The second drop at about 180 °C boils hard but shorter, and the fries turn gold. The toy keeps a count per basket.
- **The boil.** Water at the fry surface flashes to steam. Bubble rate is high at the drop and falls as the surface dries: `rate = r0 * exp(-t / τ)`, τ 2.5 s on the first fry and 1.5 s on the second. Bubbles start large and get finer. Foam height follows the rate, with a short lag.
- **Steam buoyancy.** Each puff starts hot and rises with lift `b * (T - T_air)`. Its temperature falls by `exp(-t / 1.4 s)` as it mixes, so it slows and spreads. Drag grows with size.
- **Steam visibility.** Steam is clear at the oil and turns white a few centimetres out, where it cools and condenses. Each puff is invisible for its first 0.15 s. Far out it evaporates and fades.
- **Wind shear.** Wind grows with height (a log profile), so the plume bends more as it rises.
- **Forward scatter.** Steam glows most where it lies between the lens and a light: Henyey-Greenstein, g 0.6, toward the window and the neon. Away from the lights it reads grey-blue against the sky.
- **Mains hum.** Belgian mains run at 50 Hz. The neon transformer and the fryer hum at 100 Hz with odd harmonics, not at 50.
- **Neon.** The tube glows evenly along its length; the electrodes at each end glow a little brighter. A cold segment stutters for a few frames before it strikes.
- **Moths.** They hold the light at a fixed angle and spiral in, or tilt their backs toward it and loop. They never fly straight at it.
- **Damp cobbles.** The night is damp. Cobble tops are smooth and catch a long vertical streak of the window light; the joints are rough and dark.
- **Distance.** The scooter's sound reaches the lens after its headlight: 343 m/s, so about 60 ms at 20 m. Its pitch drops as it passes (Doppler).

## Finesse

- The first frame is a picture: the neon is on, the window glows, the vent plume stands, and the light pool lies on the cobbles.
- The window is the key light. The neon is the rim light. The sky glow fills the dark at about 2 % of the window.
- Bloom has a threshold: only the window, the neon and the oil foam bloom.
- The tilt-shift band follows the shack. On a drag, the band stays on the shack.
- Every drop flares the window light for about 0.4 s, from the foam's own glare.
- Steam in the shaft is gold; steam that leaves the shaft goes grey within a metre.
- The square is empty and silent apart from the stop. Nothing else is lit.

## Tech

**Scene.**
- Square: one plane with a canvas-made cobble map (colour, roughness, normal). Roughness is low on the tops and high in the joints.
- Shack: a box body, a roof box with a light box on top, a service window opening, an awning flap hinged up at 28°, and a counter ledge. One dark painted-metal material.
- Interior: teal tiles, so the cream foam and the fries stand out. The fryer stands just inside the window: two oil wells at 1.12 m with a basket each. From the low lens only what rises above the sill reads: the foam crowns, the spatter and the baskets.
- Window light: a `RectAreaLight`, 2.4 × 0.9 m, at the window, facing out. A second, dim one fills the interior from the ceiling.
- Neon: tubes built from `TubeGeometry` with an unlit emissive material at bloom strength, plus three `PointLight`s along the strip for the wall and the ground.
- Far gables: a row of extruded gable shapes, near black, with a few emissive windows.
- Sky: a dome with a gradient (sky glow at the horizon, deep blue-black above), faint stars.
- Light shaft: one frustum mesh from the window opening to the ground, additive, faded at its edges and by depth, with slow noise.
- Haze: height haze in the shaders, toward the sky glow colour.

**Steam.**
- About 300 instanced soft billboards on the CPU. Each puff has position, velocity, temperature, size and age.
- Step: `v += (lift(T) + wind(y) - drag * v) * dt`; `T *= exp(-dt / 1.4)`; size grows as T falls.
- The shader takes an fbm alpha, the condensation fade-in, and the scatter terms for the window and the neon.

**Oil.**
- `boil` per well comes from the drop clock; `foam` lags it by 0.25 s.
- The foam crown is a dome per well. Its height follows `foam`; its vertices roll in lumps. Cellular bubbles rise over it and get finer as the boil falls.
- Spatter: up to 160 droplets jump 5 to 30 cm and glint. The rate grows with the boil squared.
- A basket rides a stiff spring between its hook and the oil. It lifts by itself when the fry time runs out.

**Post.**
1. RenderPass on a half-float target.
2. UnrealBloomPass (K2 bloom), threshold 1.0.
3. Tilt-shift: two separable passes, nine taps each. Blur radius grows with screen distance from the focus band, which sits on the shack.
4. K2 grade: tint, vignette, grain.
5. OutputPass.

**First frame.** The scene compiles and draws once before the intro clears. The vent plume is pre-run for 6 s of sim time.

## Sound

- **Neon hum:** 100 Hz with odd harmonics, a little buzz on each flicker, −40 dB.
- **Fryer:** a simmer bed of filtered noise. On a drop, a sizzle: noise through a bandpass with crackle grains. Both the level and the grain density follow `boil`.
- **Shake:** a scoop rattle, metal grains on each shake stroke, never twice the same.
- **Fill:** paper rustle and a soft scoop.
- **Distant road:** a low brown-noise rumble; a scooter or car passes now and then with Doppler and a delay.
- Everything pans with its source.

## Reduced motion and idle

- **Reduced motion:** steam rises slower and in fewer puffs; the neon does not stutter; the moths rest on the wall; a drag does not move the camera.
- **Idle:** this toy drifts at 30 fps (neon, plume, moths, simmer). It sleeps 60 s after the last input; the plume eases out over 2 s.

## 375 px recompose

- Portrait: the lens moves in to about 9 m and turns a little, so the shack sits in the lower third, centred.
- The sky above holds the plume and the roof glyph. The far gables fall below the frame top.
- Fewer steam puffs (200) and a smaller bloom buffer.
- Touch: tap the shack drops, a hold shakes, a drag looks round. The actions keep their buttons.
- Bar v2 phone layout: the Sauce stepper sits bottom left; the actions bottom right; Wind moves into Settings.

## Review focus

1. **RectAreaLight cost** on phones: if it is slow, bake the pool and the streak into the ground shader.
2. **Steam over the bloom threshold:** dense steam in the shaft must not flash white.
3. **Tilt-shift at 375 px:** the band must not blur the shack when the lens moves.
4. **Hold versus drag** on the shack: a press that moves 8 px is a drag, not a shake.
5. **Fill with an empty fryer:** Fill is disabled until a basket has fried twice.

## Tasks

### Task 1: Blockout (checkpoint)

**Files:** Create `frietkot/index.html`; add the `toys.json` entry and the menu Lab entry.

**Produces:** the scene, the window light, the neon, the post chain, the Bar v2 spec with stub handlers.

- [ ] Square, cobbles, shack, awning, interior glow, fryer wells, neon strip and glyph, far gables, sky, shaft, haze.
- [ ] Bloom, tilt-shift and grade. A static vent plume.
- [ ] Bar v2 spec wired; handlers wake the loop but do little.
- [ ] Stills at 1280 and 375 px. Checkpoint with Tom. Stop here.
- [ ] Commit: `Frietkot: blockout of the square, the shack and its light`.

### Task 2: The fryer

- [x] Oil shader, boil clock per well, double fry, basket drop and lift.
- [x] Window flare on a drop.
- [ ] Commit: `Frietkot: the fryer boils, twice`.

### Task 3: Steam

- [x] Puff pool, buoyancy, cooling, wind shear, condensation gap, scatter.
- [x] Shake: the basket rattles and a cloud rolls out.
- [x] Steam pools under the roof, waits behind the header, spills out under the awning, then drifts grey in the wind. Drifting loop at 30 fps; sleeps 60 s after input.
- [ ] Commit: `Frietkot: steam through the lamplight`.

### Task 3b: A deeper shack, and people (Tom, 2026-11-09)

Tom asked for vague human shapes, a deeper frietkot, and the look of 90s and 2000s frietbaraks.

- [x] The shack is 5 m wide and 3.6 m deep. Water-green mosaic, three menu boards (illegible), a lit drinks cooler, the fryer at the window, a serving counter beside it.
- [x] A seating room on the right (zitgedeelte): steamed-up amber windows with soft seated shapes, a light box with a red band. A high standing table on the square.
- [x] People are flat soft shapes on upright billboards, not modelled bodies: a coat, a head, two legs. Two staff inside follow the fryer and the queue. Customers walk or cycle in, wait at the window, leave with a cone, eat or smoke at the table. Some cyclists only pass, lamp lit. A staffer steps out to smoke now and then.
- [x] Time-lapse feel: four echoes per figure, 0.1 s apart, and the walk steps at 10 fps.
- [x] Backlit by the window: dark shapes with a thin rim. Long shadows run from their feet across the cobbles.
- [x] The ember flares on each draw; thin smoke leaves the mouth.
- [x] Traffic in Settings turns the arrivals on and off.

### Task 3c: The square comes alive (Tom, 2026-11-09)

- [x] Figures: two-bone legs with knees, counter-swinging arms, edges filtered by pixel size. Three looks to pick from in Settings > People: Ink (dark shape, thin rim), Line (a contour drawn in light), Haze (an out-of-focus shape).
- [x] More traffic: an arrival every 3 to 8 s. Groups of three to five young people gather round the standing table, some smoking. People walk dogs; some stop at the window and the dog waits. Motorbikes and cars pass or stop: they brake into a place, the rider or driver walks up, then they pull away slowly. Their headlights sweep the cobbles; tail lights glow red.
- [x] Weather in Settings: Dry, Drizzle, Rain, Fog. Rain shows only where light falls on it. Wet cobbles go dark and glossy; the window reflection smears into a streak; rain rings spread in the reflections. In the wet, many walk under umbrellas. Fog thickens the beam and hides the far side.
- [x] The camera swings only a little (yaw 0.1, pitch 0.05 rad); the set is built for this frame.
- [x] Village windows go on and off, one at a time; a screen flickers blue. The tower clock is lit and shows the real local time.
- [x] Neon script on the roof box: "Frituur Stefan & Hilde" (Tom). The cone glyph stands on the box at its right end.

### Task 3d: Iterations and the parish hall (Tom, 2026-11-09)

- [x] Tower clock is an open dial: only marks and hands are lit, the stone shows between. Three dials: `?clock=a` bars, `b` ring and minute stripes, `c` four long marks and dots.
- [x] Neon hands: `?font=a` Sacramento, `b` Tilt Neon, `c` Neonderthaw, `d` Monoton (`e` keeps Yellowtail).
- [x] Three original dogs: `?dog=a` wiry terrier, `b` dachshund, `c` shaggy sheepdog. Tom asked for the dog from Man bijt hond; no description of it was found, and a TV show's character stays out (no brands). Tom can describe it.
- [x] The seating room's roof falls from the kiosk side; its light box stays level on two posts. The shapes behind its glass shift, lean, lift a fork and now and then stand up.
- [x] A bike rack of six hoops. Some riders leave their bike and walk on, so bikes pile up; now and then someone comes back for one.
- [x] A parish hall left of the shack with a party on: five tall windows flash in colour at 126 BPM, mirror-ball specks, dancers' shapes; the door stands open; two stand outside smoking; coloured light spills on the square.
- [x] Time-lapse trails are smooth: nine echoes 45 ms apart with an exponential fade, no stepped walk. The square renders every frame while lively and at 48 fps while drifting.

### Task 3e: Busier, shadier, more 90s (Tom, 2026-11-09)

- [x] `frietkot/figures.js` holds every figure shape in one GLSL source; the toy and the sheet both use it.
- [x] Builds: average, tall, broad, child, old with a stick, long coat and hat, hood, cap, long hair, staff in apron and paper cap. Poses: pockets, arms crossed, a phone of 1999, a can, a wave, pointing at the menu, eating fries, scooping, handing over.
- [x] `frietkot/people.html` (noindex): an animated sheet of 24 figures, vehicles and dogs, in Ink, Line or Haze.
- [x] A line forms when the window is busy and shuffles forward. Arrivals every 2.5 to 5.5 s.
- [x] Smokers keep their own rhythm: draw length, pause, exhale; they smoke 18 to 45 s.
- [x] The deal: a long coat and a hat glances left and right by the kiosk side; a hooded buyer comes; a glinting packet changes hands; both bolt.
- [x] Staff: aprons and paper caps; the cook scoops at the boil, the server reaches out to the customer.
- [x] Backlit food photos over the counter: a burger, fries in a cone, a long sausage, a big special burger. No words, no brands.
- [x] The seating room: slim shapes walk in by the far door, sit, eat, get up and leave.
- [x] The rack sits further out; the parish hall moves left and dims.
- [x] Neon sign: FRITUUR in tube capitals over "Bij Bruno en Anja" in script (`?caps=a|b`, `?font=a|b|c|e`).
- [x] Dog: Tom's reference is the Man bijt hond logo, a scruffy line-drawn mongrel. The logo stays out; `mutt` is our own scruffy mongrel in its spirit, and the default (`?dog=d`). It sits when its owner stops.
- [x] Camera: a wider lens (47°, 64° on phones), scroll or pinch to zoom to 0.68, a breathing zoom ring and a handheld sway. Settings > Camcorder turns the sway and a tape-colour grade on and off.

### Task 3f: Lean, stop-motion, youth, shifting weather (Tom, 2026-11-09)

- [x] Lean: one sign font pair (Tilt Neon over Neonderthaw), one clock dial, one dog. No variant switches.
- [x] 24 fps. Stop-motion on twos: figures jump 12 times a second, a few millimetres off true each step, with a 12-echo smear over 0.16 s. Film grain changes every frame; the exposure flickers a little per step.
- [x] Staff draw before the steam and everyone outside after it, so steam never covers the queue.
- [x] Haze look is sharper. Umbrellas are held in the hand: a shallow canopy on ribs, a scalloped hem, a hooked handle, tipped into the walk.
- [x] The parish hall is brick, lit by its windows, its door and a lamp; lit house windows glow on their walls. Nothing floats.
- [x] Weather: Shifting (the default) moves through fronts every 50 to 120 s; gusts slant the rain and tear the steam; the cobbles dry slower than they wet.
- [x] Youth, one scene at a time: a brommer gang (one will not start, then pulls away on a wheelie), a boombox with dancers at the table, a can kicked across the square, two on the bike rack sharing a cone, a trolley ride, a couple in the hall door.
- [x] New poses in figures.js and the sheet: dancing, sitting on a rail, kicking, kick-starting, an embrace, pushing a trolley; a running gait.

### Task 3g: Reflections, sign, framing (Tom, 2026-11-09)

- [x] Wet reflections see a calmer normal, widen with distance, smear upward, fade along their length, and wobble with a fine unevenness. No hard edge, no tiles.
- [x] The script line uses Courgette, plain and readable.
- [x] Framing on thirds: a wider lens (53°, 68° on phones), the horizon on the lower third, two thirds of night sky; the frituur on the right-hand third, the church tower on the left third. Zoom stays.

### Task 3h: Pump (Tom, 2026-11-09)

- [x] Traffic: footpaths at many depths, a road lane each way at the front, bikes 26 %, motorbikes and cars 25 %, irregular arrivals; most vehicles pass, some turn in to park in frame.
- [x] Hall door: a warm corridor in a dark frame, a step, a pool of light; no floating panel.
- [x] Weather: fronts fade over half of each spell; rain swells and eases within it.
- [x] Fries neon: glass-tube shader, a striped cone, six fries, a dollop in the picked sauce's colour; a chase: fries one by one, hold, flash, dark but for the cone.
- [x] Reflections: the sign, the fries, the light box and the seating-room windows also lie in the wet cobbles.
- [x] Shading: contact shade at wall feet and round the buildings on the ground; split-tone grade; stronger bloom.

### Task 4: Moths, the cone, the village (Tom, 2026-11-09)

- [x] Moths spiral round the neon, the strip and the light box; they dart in and drift to other lights; Settings > Moths turns them off.
- [x] Fill: a paper cone on the ledge; the fries rise in, a dollop of the picked sauce drops and settles; the first customer waiting takes it.
- [x] The roof chase is gone. A small fries neon sits on the front wall right of the window; in rain it sputters.
- [x] The village: a far row with hipped and gabled roofs, chimneys, hedges along every front, a nearer scatter of cottages, trees; nothing floats.
- [x] Four sodium streetlights in the distance light pools on the road.
- [x] People move faster: walkers 1.75 times life, vehicles a fifth faster.

### Task 4 (old): Sauce, cone, moths, traffic

- [ ] The cone fills; the sauce lands in its colour.
- [ ] Moths spiral at the neon; a scooter or car crosses now and then.
- [ ] Commit: `Frietkot: the cone, the moths and the road`.

### Task 5: Sound

- [x] Neon hum, sizzle by boil, scoop rattle, paper, road. Pans.
- [x] Rain hiss and drips, wind by gust, the hall's kick at 126 BPM and murmur.
- [x] Engines per vehicle with Doppler; the dud moped coughs on each kick.
- [x] Muted by default; the context sleeps with the loop and on a hidden stage.
- [x] Commit: `Frietkot: hum, sizzle and road`.

### Task 6: Settings, 375 px, QA

- [x] Settings rows and persistence. Reset also clears the cone and the view.
- [x] Browser-pane checks at 1280, 375 x 812 and 812 x 375; Bar v2 test 96/96.
- [x] Reduced motion: no ambient loop, no handheld sway, one echo. Idle sleep holds.
- [x] Phones aim lower, so the shack sits near mid-height.
- [x] Rain under MSAA: the fade clamps its UV, so thin drops never darken.
- [ ] Record the cost. Commit.

## Main shelf as No. 39 (2026-11-09, Tom: get it to the main page)

Tom vetted the toy for the main shelf. `toys.json`: `number` 39, `sub` null, the entry sits after Ten seconds. The tile moves from the Lab list to the main shelf in `index.html`. The page's intro fallback shows No. 39. No emblem yet.

## Intro emblem (2026-11-09, Tom: the three-fry cone)

`shared/emblems/frietkot.svg`, a luminance mask: a striped paper cone with three fanned fries. The first draft was the shack scene; Tom rejected it. `toys.json` and the page fallback point to the file.
