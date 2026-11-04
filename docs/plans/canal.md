# Canal at dusk (`canal`) implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. One fresh session builds this toy, task by task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A Flemish canal at blue hour in the rain. Tap the quay lamps to light them one by one; their reflections stretch across rain-pocked water, and a paper boat drifts through the light.

**Architecture:** three.js 0.170 on the K2 scene from Fireworks. Step-gabled facades come from one shape generator. The water is a half-size mirror pass, distorted by procedural rain ripples. One lamp-light array feeds facades, cobbles, rain and water.

**Tech stack:** three.js 0.170 (ExtrudeGeometry, BufferGeometryUtils, EffectComposer, UnrealBloomPass, ShaderPass, OutputPass), simplex-noise, Tone.js through `kit.tone()`.

**Spec:** shortlist 61 in [toy-ideas.md](../toy-ideas.md); rank 16 in [toy-plan.md](../toy-plan.md); batch rules in [README.md](README.md).

| | |
|---|---|
| Size, estimate | L · $40 to $70 |
| Kits | Uses K2 from `fireworks/index.html`; K2 snow becomes rain |
| Before the build | D1, settled by the Fireworks build |

## The shot

A low camera on the near quay, looking down the canal. Facades line the far side: brick, a few whitewashed, step gables and bell gables against a deep blue sky.
Far down the canal, one humpback bridge, and beyond it the dark tower of a belfry in the haze. Six iron lamps stand dark along the near quay.
Some windows are lit warm. The water holds the sky and the windows as broken streaks.
Every object has a job: lamps light, the bridge makes the circle, the belfry rings. Nothing is there only to say "Flanders"; add nothing else.

## Hero moments

1. **Lighting the lamps.** Tap a lamp. It starts as a dim pink-red glow and warms to sodium orange over 3 s, as low-pressure sodium lamps really do (over minutes, in life). Its pool spreads on the wet cobbles, and its reflection stretches down across the water.
2. **Dry: the mirror.** The rain stops. The canal goes still, the facades stand doubled, and the bridge's arch meets its reflection in a full circle.
3. **Rain you see only in the light.** Streaks show only in the lamp cones and against lit windows, as real rain does.
4. **The carillon.** Tap the belfry: a short peal of bells drifts down the canal, late and soft.
5. **A paper boat.** It drifts toward you, rocking, and lights up white as it passes under each lit lamp's reflection.

## Loop

- Tap a lamp: light it. Tap it again: off.
- Tap the belfry: the carillon.
- Tap a window: it switches on or off.
- Tap anywhere else: a ripple ring spreads where the tap meets the water, or at the canal's far end.
- Dusk: from blue hour to night. Windows light one by one as it darkens.
- + Boat: a paper boat sets off from the bridge.
- Drag: look along the canal a little.

## Bar

| Control | Content |
|---|---|
| Chips | Dry, Drizzle, Rain, Downpour |
| Slider | Dusk |
| Action | + Boat |
| Settings | Letterbox: Off, On · Quality: Standard, High (shared) |
| How | Click/Tap: a lamp or the belfry · Drag: look along the canal · Space: boat (mouse devices only) |

## Tech

**Facades.** `house(w, h, gable, seed)` returns one extruded `Shape` per house, merged into one geometry for the row.

| Gable | Share | Profile |
|---|---|---|
| Stepped | 60 % | 3 to 6 steps up each side to a small top block |
| Bell | 20 % | A curved top with scroll shoulders, 12 points per side |
| Straight | 20 % | A plain triangle |

Width 4 to 7, height 9 to 15, 12 to 16 houses.

- **Windows, in the facade shader:** a grid from width and height. Each window has a seed. It turns on when Dusk passes its threshold, warm (0.8 0.12 70) with curtain variation.
- **One window in fifteen** flickers cool blue: a television.
- **Brick:** a course pattern as in Night viaduct's masonry, in muted reds and browns (0.45 to 0.55, C 0.06, h 30 to 45). Some facades are lime-washed (0.85 0.02 80).

**Quay.** Cobbles from a shader pattern, with wetness from a puddle mask (noise).
Puddles sample the mirror target with an offset, to reflect lamps and windows. This is a cheap trick, but it reads.

**Water.** A half-size mirror pass renders the facades, sky, bridge and lamps with the camera mirrored about the water plane. The water shader samples it with three effects:

1. **Rain ripples:** a cell grid. Each cell has a random ring start time; an expanding ring perturbs the normal. Density follows the chip.
2. **Wind ripple:** noise.
3. **Vertical smear:** reflections stretch toward the camera, as they do on real water.

On Dry, the ripples stop, the wind ripple falls to a tenth, and the smear shrinks.

**Lamps.** Six on the near quay, four on the far one.

- **Hit targets:** 28 px around each head, ray-cast on tap.
- **Light:** each lit lamp is a `vec4` in a lamp array (up to 10). Every lit shader reads it.
- **Glow:** a sprite with bloom.
- **Sodium warm-up:** the colour runs from 0.5 0.12 10 (pink-red) to 0.75 0.16 65 (orange) over 3 s with an ease-out. Intensity rises from 15 % to full.

**Rain (from K2 snow).** Points become streaks: instanced quads stretched along the fall velocity in screen space.
Brightness is the lamp array's light at the drop, plus window glow behind it. The ambient term is near zero, so rain shows only where it is lit.

**Boat.** About 12 triangles in a folded-hat shape, inline. White paper with translucency to lamp light.
It drifts along the canal's centre spline, rocking on a sum of sines and turning slowly. A V-wake is a pair of fading lines in the water normals.

**Bridge and belfry.** One humpback arch, extruded. One belfry silhouette, a tower with an octagonal top, deep in the haze. Both are hit targets.

## Sound

- **Rain bed:** two layers, hiss on stone and plinks on water. The plinks are short sines with random pitch, and their rate follows the chip.
- **Lamp:** a relay click, then a soft rising buzz for the 3 s warm-up that settles into silence.
- **Carillon:** an original eight-note phrase, never a known tune.
  - Bells are additive, five sine partials: hum 0.5, prime 1, tierce 1.2, quint 1.5, nominal 2.
  - The tierce is a minor third. That is why real bells sound minor.
  - It arrives 0.6 s late, low-passed and with a long reverb, from far away.
- **Boat:** no sound. **Wind:** a low bed that follows the chip.

## Finesse

- Lamp reflections are long vertical streaks that break up in the rain and become clean pillars in Dry.
- Lit windows' reflections waver; dark windows' do not show.
- The belfry is barely there until the carillon plays.
- Wet cobbles turn mirror-dark between lamps and shine under them.
- The boat brightens only under lit lamps, so its path reads as a string of moments.

## Reduced motion and idle

- **Reduced motion:** the rain is slower and softer, there are no ripple rings (a calm blur instead), the boat moves at half speed, and lamps warm up over 1 s.
- **Idle:** rain drifts. It runs at 30 fps when drifting and sleeps 60 s after the last input. On Dry with no boat, the loop sleeps when the water settles.

## Review focus

1. **Lamp taps at 375 px:** heads crowd together. The 28 px targets resolve to the nearest head, and a miss falls through to windows, then to a ripple.
2. **Mirror cost:** the mirror pass is the heaviest part. The ladder drops it to quarter size before it drops bloom.
3. **Changing chips from Downpour to Dry:** rain thins over 2 s, ripples die out, and the mirror clears over 3 s. Nothing pops.
4. **The carillon tapped twice:** the second tap waits for the phrase to end; it never overlaps.
5. **A boat under all ten lamps:** at most 10 lamps light it. The lamp array never overflows.

## Tasks

### Task 1: The canal, blockout

**Files:** Create `canal/index.html` and the bean.

**Produces:** marked `K2` from Fireworks; `house(w, h, gable, seed)`; `row` (merged facades); `mirror` (render target and camera); `uLamps` (vec4[10]).

- [ ] Facades, quay, bridge, belfry, sky, haze, water with the mirror pass. No rain yet.
- [ ] Q1, Q2 and stills at three Dusk values in Dry, at 1280 and 375 px. Checkpoint with Tom. **Do not start Task 2 until he approves the street.**
- [ ] Commit: `Canal at dusk: the gables and the mirror, blockout`.

### Task 2: Lamps and windows

**Produces:** `lamp(i).toggle()`; `pick(x, y)` returns a lamp, the belfry or null.

- [ ] Lamp picking, the sodium warm-up, pools on wet cobbles, window thresholds and the TV flicker.
- [ ] Screenshots with three lamps lit, Rain and Dry. Checkpoint with Tom.
- [ ] Commit: `Canal at dusk: sodium lamps that warm up`.

### Task 3: Rain, ripples and the boat

- [ ] Rain streaks lit only by light, ripple rings, the chip easing and the paper boat.
- [ ] Commit: `Canal at dusk: rain in the lamplight, a paper boat`.

### Task 4: Sound

- [ ] Rain bed, lamp relay and buzz, carillon and wind. Q9.
- [ ] A listen-through of the carillon with Tom.
- [ ] Commit: `Canal at dusk: rain, lamps and a distant carillon`.

### Task 5: Bar, menu and QA

- [ ] Bar, Settings and persistence. `toys.json`, and the menu Lab entry with its hook.
- [ ] Q1 to Q10. Tick the bean and record the cost. Commit.

## Kit handoff

The mirror pass with rain ripples, marked. Lantern lake (60) or Lighthouse storm (95) would copy it.
