# Glowworm cave (`glowworm`)

Lab toy, idea 351. Bean `stimming-25qi`. Plan: `docs/plans/glowworm.md`.

A small boat drifts on a still underground river in a limestone grotto. Eleven thousand glowworms shine blue-green on the roof, dense in bands and on the fringes of the flowstone curtains. Each worm hangs a few silk threads beaded with droplets. The black water doubles every point; the far passage's arch and its double make a ring of light.
Tap the water: a hand dips, rings spread and the doubled lights shiver. Tap the roof: a drop falls from there and plinks. Any sound dims the nearest worms; they come back slowly, one by one.

## Play

| Input | Does |
|---|---|
| Tap or click the water | Near the boat a hand dips in; further out the hand flicks a few drops. Rings spread; the worms above dim |
| Tap or click the roof | A drop falls from that point and lands with a plink; the worms round it dim |
| Drag | Look round: left and right up to 90 degrees off the bow, up to 46 degrees up |
| Arrow keys | Look round in steps |
| Drip (Space) | A drop from a random point of roof in view |
| Voice (V) | A soft voice in the boat: the worms dim in a wave from the boat out, nearest first |
| Drift slider | The boat's pace, 0 to 0.3 m/s; 0 holds it still |

- The boat loops an ellipse round the grotto's middle (9 by 18 m). The view follows its heading, plus the look offset.
- A dim: each worm drops toward 4 percent of its glow over 0.5 to 1.2 s, holds 1.6 s, and comes back with its own time constant of 3.5 to 9 s. The wave runs out from the sound at 6 m/s. The rock's glow dims with its worms.
- While the boat drifts the cave drips by itself every 14 to 30 s, a visible drop each time. Auto drips stop 25 s after the last input.
- The first frame: the boat a quarter of the way round, the passage arch ahead, its double in the water.

## How it is built

| File | What |
|---|---|
| `index.html` | The page shell |
| `main.js` | State, the boat, the camera, drops, ripples and dims, pointer, Bar v3 spec, frame loop |
| `cave.js` | The grotto as one signed distance (JS and GLSL from one source), the colonies, picking |
| `render.js` | Raw WebGL2: the passes and the instanced buffers |
| `shaders.js` | Five small programs: rock, worms, threads and drops, water, final |
| `sound.js` | Web Audio: a stone echo, the bed, one-shots |

- 3D, first person, eye 0.85 m over the water. No lamp: the worms are the only light.
- The grotto: the inside of an ellipsoid (22 x 4.8 x 38 m, top 4 m over the water), a passage out at the far end that bends out of sight, two octaves of relief, and seven flowstone curtains with stalactite fringes. The noise is an integer hash, so JS and GLSL give the same rock and each worm sits on it.
- The worms: rays go up from the water to the first rock overhead; a face that looks down keeps a worm. Bands on the roof plan and clumps set the density; a curtain hit always keeps its worm. Brightness is log-normal. Four to ten threads each, 4 to 42 cm.
- The rock pass marches at half size. A ray that meets the water first turns up again, so one target holds the rock and its mirror image. Alpha holds the path length; a negative path marks water.
- Worms and threads are instanced sprites, drawn twice: direct, and with y flipped for the double. Each tests the rock's path length at its pixel. A worm is a Gaussian at least 0.75 px wide; a thread is a ribbon one pixel wide whose light is its cover of the pixel, so far threads fade out. Beads glint as the boat moves.
- The water pass: the mirror with Fresnel, tilted by ring ripples (two wave trains per ring, long waves ahead) and a faint slow swell. Waves a pixel cannot hold leave the slope.
- Bloom from `shared/glow.js`, the film curve from `shared/output.js`, a vignette and grain.

## Sound

Web Audio, muted by default. Every voice runs into a stone echo (a 4.6 s convolution tail that darkens as it decays, with early taps).

- The bed: a deep murmur of the river, a far trickle that swells and falls. While the boat drifts, soft laps on the hull.
- The drop: a click and a bubble ring that rises in pitch; far drops are quieter and wetter.
- The hand: a slosh, a low gloop, bubbles, then drops off the fingers. A far tap: three small plips.
- The voice: a hushed "o-oh", a buzz through three vowel formants with a breath under it.

## Frame loop

- Lively while a drop falls, a ring is younger than 6 s, the pointer is down, or the look eases: full rate.
- Drifting (the boat moves, the worms breathe, a dim clears): 30 fps.
- Asleep 60 s after input: the drift eases out over 2 s, then the loop stops once dims have cleared.
- Reduced motion: the boat holds still, no breathing, no thread sway, no swell; rings are half height; dims still show.
- Slow frames step down twice: pixel ratio 1, then a third-size rock pass, fewer march steps, half the threads and three bloom levels.

## QA

Captures in `docs/qa/glowworm/`. Q10 on headless Edge (D3D11, RTX 3070): 7.8 ms mean frame through taps, a drip and the voice. Tom checks on a real screen.
