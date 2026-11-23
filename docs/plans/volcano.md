# Volcano (`volcano`) plan

Status: active · Bean: `stimming-4wnw`

Idea 365, group C, a cinematic diorama. Source: `docs/toy-ideas.md`, Tom's picks, 2026-11-17, and the bean.
Tom sized the full toy XXXXXL: a three.js parade piece at Railgun scale, its own toy apart from Lava coast (idea 99).
Batch 3 brief: an MVP at high fidelity, with icons, the intro emblem and Bar v3. One hero moment, finished. No extra modes.

## The hero moment

1. Hold on the stage. Pressure builds under the vent: the ground trembles, the crater glow swells and pulses, the steam thickens, a low tremor hums.
2. Let go. The vent blasts: a white-hot flash lights the cone and the sky.
3. Incandescent bombs arc out on long streaks. A lava fountain stands over the vent. An ash column climbs, lit orange from below.
4. A pressure ring runs out from the vent. When it reaches the camera, the boom lands and the frame shakes: light first, sound after.
5. Lightning forks inside the column. Its thunder arrives late, by distance.
6. Bombs land on the flanks, bounce and roll down. Each one lights the ground near it and cools from yellow to red to dark.
7. The long tail: the fountain sinks, the column leans with the wind and drifts off as a dark cloud, the crater glow dims, the last bombs go out. The loop sleeps.

## Defaults (open questions, answered here)

The MVP's answers. Stage 2 (below) replaces the camera, the scale and the look.

| Question | Default | Why |
|---|---|---|
| 3D or flat | 3D: three.js 0.170, the Scene stack type | Tom sized it as a three.js parade piece. Light that falls on a cone and a cloud needs depth. The later stages move the camera. |
| Day or night | Blue hour, just after dusk, facing the last light in the west | Glow carries the scene; the cone stands as a silhouette against the afterglow. Ash reads only where fire and lightning light it (Look rule). |
| Eruption | One Vulcanian blast that opens into a short Strombolian fountain: bombs, fountain, ash column, lightning | It has a clear start (the blast), a peak (fountain and column) and a long tail (the drift and the cooling). All of it is light. |
| Trigger | Hold to build pressure, release to erupt. A longer hold makes a bigger blast (full at 2.5 s). A quick click throws a small burst. Space does the same as a hold. | The hand feels the build-up. One gesture, one eruption; the size is the only variable. |
| Slider | Wind | It bends the column and carries the cloud off. It changes the shape of the tail, not the event. |
| Camera | A fixed shot from the plain, 1.15 km from the vent, looking up. The column leaves the top of the frame. On a tall stage the lens widens and the camera steps back. | The cone sits low and large; the column has room to climb. |
| Scale | Metres. The cone stands about 330 m over the plain; the camera eye is 25 m up. Sound travels at 343 m/s, so the boom comes about 3.5 s after the flash. | A true delay that a person can wait for. |

## The cut (XXXXXL to the MVP)

| In the MVP | Later stages (not built) |
|---|---|
| One fixed shot | A parade path: the camera moves round the cone, flies close, pulls back to the coast |
| One eruption kind, scaled by the hold | Kinds as a choice: Strombolian pops, a Plinian column, a fissure curtain |
| Bombs that land, roll and cool | Lava flows down the gullies, with crust and breakouts |
| Ash column and drifting cloud | A pyroclastic flow down a flank; ash fall on the lens |
| Blue hour | Time of day on `shared/daytime.js`; a day shot with a grey column |
| Plain land | The sea and the lava coast (stays its own toy, idea 99); village lights |

## Physics (metres, seconds)

- Gravity 9.81. Bombs fly ballistic with a small quadratic drag; fountain spatter has more drag.
- A bomb that hits the ground bounces (normal restitution 0.35, tangent 0.7). Slow bombs roll down the slope with friction and stop where the slope is gentle.
- Temperature falls exponentially: spatter in 1 to 3 s, bombs in 8 to 25 s. Colour comes from a blackbody ramp; brightness goes as about T to the 2.5.
- Ash puffs: a jet that slows with drag, then a buoyant rise that fades with height; the radius grows with travel (entrainment). Wind grows with height and carries the puffs.
- Lightning: 1 to 6 bolts in the lower column for a blast over a third of full size.
- The pressure ring grows at 343 m/s from the vent. The boom and the shake land when it reaches the camera.

## Look

- One key light: the vent. The flash, the fountain and the glowing bombs light the cone, the column and the haze.
- The sky: a blue-hour gradient with the afterglow low in the west behind the cone, faint stars, a far ridge in haze.
- The cone: near-black basalt with radial gullies, a crater rim that glows from inside.
- Haze in every shader: distance fog toward the horizon colour, plus warm in-scatter round the vent.
- Bloom with a threshold; a grade with vignette and grain. The pressure ring bends the picture a little where it runs.

## Sound (Web Audio, muted by default)

| Sound | When |
|---|---|
| Tremor: a low rumble and a sub hum | At once, while the pressure builds (the ground carries it fast) |
| Boom: a low thump, a crack with the highs taken off by distance, two echoes off the land | Distance over 343 m/s after the blast |
| Roar: the fountain's jet, a crackle in it | Late by the same delay; it lasts as long as the fountain |
| Thunder | Late by the distance to each bolt |
| Bomb landings: dull thuds and a rattle | Late by each bomb's distance |

Delayed sound follows the batch rules: the audio clock, a handle per node, mute and a hidden tab cancel them, `kit.rest()` waits for pending sounds.

## Frame loop

- Lively while the pressure builds, an emitter runs, a bomb is hot or a bolt flashes.
- Drifting at 30 fps while the cloud drifts and the crater steams.
- Asleep 60 s after the last input; ambient motion eases to a stop over 2 s.
- Reduced motion: no shake, no steam drift, no twinkle. A blast still plays, with fewer streaks and a softer flash.

## Performance

- Budgets: 30 fps or better on the dev PC; each shader program stays small (Windows D3D11 links big ones slowly).
- Counts: 4,000 spark streaks, 700 ash puffs, 24 bolt segments per bolt.
- Ladder (`shared/detail.js`, three rungs): pixel ratio, then bloom size, then counts halved.

## Files

| File | Holds |
|---|---|
| `volcano/index.html` | The page skeleton |
| `volcano/main.js` | Bar, camera, frame loop, gestures, life cycle |
| `volcano/terrain.js` | The height function, shared by the mesh and the sim |
| `volcano/erupt.js` | The sim: pressure, bombs, spatter, ash, lightning, pressure ring |
| `volcano/scene.js` | three.js objects and shaders |
| `volcano/sound.js` | Web Audio |

## Tasks

1. Plan, bean. Blockout on the stage with a 1280 x 800 capture: `docs/qa/volcano/01-blockout-1280.jpg`.
2. Sim and render: the blast, bombs, fountain, column, lightning, ring, the tail.
3. Bar v3, sound.
4. Icon round `volcano-1` (Current, A, D), emblems, intro emblem, Lab tile and hook, `toys.json`.
5. QA Q1 to Q10; `docs/toys/volcano.md`; commits.

## Stage 2: a Java range seen from a village (Tom, 2026-11-23)

Tom: "a realistic range, perhaps inspired by the big Indonesian ones; we want the ring clouds; we want the light to react; volumetric, raymarched; think Tornado alley and Railgun."
Then: "clouds around its summit and in the skies above to convey scale, with the volcano in the background to a small village in the foreground", and "Fire toy fire and smoke shader".
Two tries came first and were dropped. A Villeneuve spire with sheet decks looked bad (branch `wip/volcano-villeneuve`). Mount Doom with card mountains was a step toward this stage.

References (Wikimedia Commons): Bromo and Semeru at sunrise from Penanjakan; Sumbing, Sindoro and Andong from Merbabu; Merapi from Merbabu over a sea of cloud.

| Part | Built |
|---|---|
| Scale | True. The active cone stands 2.2 km over the lowland on a 5.2 km base, fluted by ribs as Batok is, with a breach gully down the right flank as Semeru has. |
| Range | A twin cone behind on the left (Sumbing), an arc of caldera wall on the right (Tengger), far cones 25 to 36 km out. |
| Eye | 14 m over a village terrace, 8.5 km from the vent. The boom comes about 25 s after the flash. |
| Village | About 90 houses, 70 to 770 m out: plaster walls under hipped terracotta roofs, lit windows. One instanced mesh (`village.js`). |
| Clouds | One raymarched pass at half size (`clouds.js`, after Railgun's cloud pass): a broken collar round the summit's flanks, a cap on the twin, a broken deck at 3.9 to 4.7 km. A composite writes their depth, so the cones and the clouds hide each other. |
| Column | A 3D fluid on the GPU (`plume.js`, K3 from Jet hover's port of Fire): 48 x 72 x 48 cells of 70 m over the vent. The vent's jet loads heat and ash; buoyancy, wind and vorticity carry them into the deck. |
| Shading | The column takes Fire's smoke light (shadow taps, multi-scatter, powder, Henyey-Greenstein) and Fire's wood flame ramp, broken by the smoke's noise. It marches in the cloud pass and joins the clouds front to back by distance. |
| Light | The vent, the flash, the bolts and the hot bombs light the collar, the deck, the column and the village walls, with falloff by distance. |
