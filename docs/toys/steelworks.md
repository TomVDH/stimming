# Steelworks (`steelworks/`)

| | |
|---|---|
| Dutch | Staalfabriek /ˈstaːlfaːˌbrik/ (draft) |
| Motto | None |
| Shelf | Lab, tag "Stimming Lab" |
| Stage | None |
| Series | None |
| Accent | `oklch(0.76 0.17 62)` |
| Sound | Yes |
| Legacy build | No |
| Signed off | No |

## Idea

Idea 204 Furnace tap, grown to XXL (Tom's picks, 2026-11-23): a steel mill at night; tap the blast furnace and the iron runs. Bean `stimming-2t3o`. Plan: [steelworks.md](../plans/steelworks.md). This build is the MVP: the tap and the iron run. The ladle, the converter charge and the blow wait.

## Rules

- The camera does not move. The drill, the iron, the gun and the light change the scene.
- One sim drives the iron: the surface shader draws it, its hot cells place the lights, the fume emitters and the sparks.
- No people and no props (Tom, 2026-11-23). The drill and the clay gun move on their own.
- No real mill, company or plant names, and no markings (hard rule 11).

## Direction

- The cast house at night, seen from a raised walk 6.5 m over the cast floor, about 50 degrees high. The furnace stands in the left half with its bustle ring and peepholes; the trough crosses toward the right; the iron runner runs off the right edge to the spout; the slag runner comes toward the eye.
- The iron is the key light. The second light is cool: the yard lights shine through the right wall's high windows as shafts in the haze (Tom, 2026-11-23).
- A narrow stage widens the lens and steps the eye back and up.

## Controls

Bar v3, from the `bar` spec in `initPage()`.

| Slot | Holds |
|---|---|
| Actions | Tap (hold; Space), Plug (P) |
| Slider | Flow: the bore, so the cast rate and the jet's size |
| Settings | Quality (shared), Reset |

| Input | Does |
|---|---|
| Hold on the stage | The drill bores; it breaks through after 1.2 s of hold |
| Release early | The drill backs off |
| Click the running iron | A splash of sparks |
| Space | Hold to drill |
| P | Plug the taphole |

## The cast

1. Drill: the drill swings in, grinds and throws sparks. The taphole clay glows brighter as the bore deepens.
2. Blow (2.2 s): the taphole gushes iron and gas, a large spark fountain, a light flash, a shake.
3. Cast (40 s, then the gun plugs by itself): the trough fills, the iron passes the skimmer and runs to the spout in about 15 s, the slag floats over the gate into its own runner and spills into the slag pot. Sparks fountain up out of the ladle pit.
4. Plug: the clay gun swings in, the jet chokes and stops. The runners drain, crust over and cool from yellow to red to grey with a silver skin and dull red cracks.

## The model

- The iron: a channel sim in JS (`iron.js`) on three channels (trough, iron runner, slag runner), 0.25 m cells, 120 steps a second. Each cell holds iron depth, slag depth and heat. A pipe model moves it: each link keeps a flux with inertia, linear damping and a drag that stops thin, cold iron. Gravity runs 16 times strong: the toy compresses the cast in time.
- The skimmer passes only iron, over a dam; the gate past it passes only the slag on top. The spout and the slag lip are free overfalls.
- Heat: thin iron cools fast, deep iron slowly; a pool over 0.1 m stays liquid. Hot iron melts back into the cold skull from the last cast.
- Light: ten point lights. The jet; seven from the hot cells along the channels; the ladle pit; the slag pot.
- Sparks: up to 9,000 streaks in a ring buffer. The CPU writes each once at launch; the vertex shader solves its flight with drag. One spark in three is a carbon spark that bursts into three to five forks at its end.
- Fume: K3 copied from `jethover/fluid.js` (64 x 40 x 40 cells, 0.3 m), with four emitters (the jet, the trough, the skimmer, the runner) and the hood's draught. It lights from the iron below, as Fire's smoke does.

## Passes

1. The scene: the hall (one merged mesh, one light-cheap material), the carved floor, the iron surface, the streams, the sparks.
2. Haze: a march for the shafts (window shapes, mullions, the furnace's shadow), the iron's lights in closed form.
3. Fume: a half-size march, blurred, laid over the scene with the heat's shimmer.
4. Bloom, grade, output.

## Sound

Web Audio, muted by default. The hall's fans and mains hum while the cast runs. The drill grinds with a hammer rattle. The tap roars with gas thumps, and the run rushes. Sparks crackle with the fountains. The blow, the clay gun and a splash each have their own hit. Indoors, so no distance delay.

## Frame loop

Lively while the drill turns, the iron moves or sparks fly; drifting at 30 fps while the fume settles; asleep 60 s after the last input, over 2 s. Hidden stops the loop and the sound. Reduced motion: no shake, no flicker, fewer sparks; the cast still runs. Slow frames step down: the pixel ratio, then the haze steps and the bloom, then sparks and fume steps.

## Known

- Capture with Edge headless on D3D11 (RTX 3070): about 6 to 8 ms a frame.
- The first frame is dark by design: the hall waits for its iron.
- On a narrow stage the lower half of the frame is dark low floor; the framing there is loose.
