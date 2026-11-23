# Whiteout (`whiteout`)

Lab toy, idea 209. Bean `stimming-dl2w`. Plan: `docs/plans/whiteout.md`.

A small orange hut stands on an ice field at night, in a blizzard. A mast with three guy wires stands behind it. The storm comes in gusts: a front arrives from the right, the haze thickens, the horizon and then the hut fade to grey, and the gust passes. Tap and the lamp over the door switches on. Its filament catches with two flickers, and a warm cone pours down into the driving snow. Every flake streaks through it, the halo glows in the haze, and the gusts swallow the cone and give it back.

## Play

| Input | Does |
|---|---|
| Click or tap the stage | Switches the door lamp on or off |
| Hold (260 ms) or drag | Calls up a gust and keeps it while you hold; let go and it passes |
| Lamp (Space) | Switches the lamp; the button shows its state |
| Gust (G) | Sends one gust across the set |
| Wind slider | Calm to gale: the haze, the gusts, the wind speed, the ground drift |

- The first frame: the storm between gusts, the hut clear, the window warm, the lamp off.
- Gusts come by themselves every 6 to 21 s, more often in a strong wind. A slow breath moves under them.
- After 60 s with no input the storm eases to a stop over 2 s and the loop sleeps. The snow stands still as a photograph.

## The storm

| Part | Model |
|---|---|
| Haze | Extinction 0.004 to 0.026 per metre with the slider. A gust multiplies it by up to 1 + 6.5 g: the hut at 24 m falls to about 2 percent. Puffs come from a wind-carried 3D noise, stretched along the wind. |
| Ground drift | A layer under 0.5 m that streams faster than the air, in streaks along the wind; on the ice, snakes of drift run over the surface. It starts at a moderate wind. |
| Gust fronts | The page keeps the last 8.5 s of the gust strength in a small texture. Each point reads it with a delay by its distance downwind, so a front crosses the set from the right. |
| Snow | 11,000 flakes on Standard. Half fill the view; half gather round the lamp's cone and fade out away from it. Each flake's place is a function of its seed, the wind travel and the storm clock. Streaks are a 1/60 s exposure; near flakes blur to soft discs off the focus plane at 24 m. |
| Lamp | A hooded bulkhead, about 60 degrees, aimed down and out. Light only falls in front of the door wall. The filament heats in about 60 ms and cools in about 220 ms; its light climbs as heat to the power 3.2 and turns from red to warm white. |

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the storm (gusts, wind travel), the lamp filament, the camera, the pointer, Bar v3 spec, frame loop |
| `world.js` | The set in metres: the hut, the door, the window, the lamp, the mast and wires, the wind, the moon, the camera |
| `shaders.js` | The GLSL: surfaces, haze, light, snow, final |
| `scene.js` | Raw WebGL2 passes, the noise texture, the gust texture |
| `sound.js` | Web Audio: the wind bed and the one-shots |

- 3D, one fixed camera: a long lens (about 20 degrees) at eye height, 25 m from the hut. On a portrait stage the lens widens and the aim moves to the lamp.
- The surfaces: one signed-distance march into a G-buffer (normal, depth, material, rime, occlusion, a soft moon shadow), once per size. The camera never moves, so each frame only lights it.
- The ice: far swells, sastrugi that run with the wind, a skirt of snow round the hut, a lee drift, a scoured windward side. Far rays that graze past the ice meet a flat plane with an open shade.
- Rime: white feathers on faces that meet the wind (the hut's windward side, the mast). The door and the lamp face the lee.
- The haze: a half-size march, 34 fine steps to 42 m and 10 long ones to 170 m, then an even tail to the surface. Fire's smoke lighting (`shared/smoke.js`: Beer, multiple scatter, powder, an ambient floor; Whiteout's own look) shades the lamp's light after a three-tap self-shadow march; its Henyey-Greenstein phase gives the cone its forward glow and the moon its glow in the upper right. A five-tap blur on both axes hides the dither.
- The guy wires: analytic segments in the light pass with pixel coverage, rimed white, fading into the haze.
- The snow: instanced streaks on `shared/precipfield.js` (`PF_SNOW`), lit in the vertex shader (sky, and the lamp with a forward lobe), dimmed by the haze, and tested against the surface depth.
- Post: bloom (`shared/glow.js`), the lamp flare (`shared/flare.js`: veil, orb and ghosts, no long streak), the grade (`shared/grade.js`).
- The light pass runs up to 1.5 times larger than the canvas while the pixel budget allows (2.2 million), so the wires stay clean.

## Frame loop

- Drifting at 30 fps while the storm moves (a timer gates each frame).
- Lively at the display rate while a switch is in flight, a hand-made gust rises or falls, or the pointer is down.
- Asleep 60 s after the last input: the storm eases to a stop over 2 s; the loop stops.
- Hidden tab: the loop and the storm clock stop at once.
- Reduced motion: the storm stands still and no gust comes by itself. The lamp fades on and off with no flicker; Gust and a hold still swell the haze.
- Slow frames step down up to three rungs (`shared/detail.js`): no supersampling and a lower pixel ratio, fewer bloom levels, fewer flakes.

## Sound

Muted by default. The context suspends 1.5 s after the loop sleeps; the bed stops with the storm.

- The wind bed: a low rumble, a howl band that rises with each gust, the hiss of blown snow. It comes from the right and swings left in a gust.
- The guy wires sing in strong gusts: an Aeolian tone and its fifth, with a slow waver, at the mast's place in the frame. The tone rises with the wind.
- The switch: a heavy click and a knock; on a cold start, the contact chatters with the two flickers and the filament rings faintly. Off: the bulb ticks as it cools.
- A gust: a swell that pans from right to left, and a knock and a creak from the hut walls a moment later.

## QA (headless Edge, D3D11, RTX 3070), 2026-11-23

| | Result |
|---|---|
| Q1 | `node --check` passes on the five modules, the menu scripts and the icon page script |
| Q2 | Clean console in play (lamp, gust, slider, both sheets), on the menu with the tile hovered, and on the icon page |
| Q3 | Captures in `docs/qa/whiteout/`: 1280 x 800, 375 x 812, 812 x 375; storm, lamp, gust, held whiteout, calm, gale |
| Q4 | Drifting: 63 rAF in 2 s. Asleep: 0 rAF in 2 s |
| Q5 | Hidden tab: 1 rAF in 2 s (the frame in flight), then none |
| Q6 | Reduced motion: clean console; 0 rAF at rest; a tap switches the lamp |
| Q7 | Lamp, Gust, Wind slider (3 controls); How to play has 4 rows |
| Q8 | Space switches the lamp; G sends a gust |
| Q9 | The context runs after a gesture and is suspended at rest |
| Q10 | Frame times through a switch and a held gust: median 7.6 ms, p95 8.3 ms |
| Load | First frame 774 ms after navigation, shaders included |
