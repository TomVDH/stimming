# Glowworm cave (`glowworm`)

Status: built as an MVP, 2026-11-23; waits on Tom. Bean `stimming-25qi`. Toy doc: `docs/toys/glowworm.md`. Idea 351, group F: "Blue points on a cave roof, doubled in the water."

## The hero moment

A small boat drifts on a still underground river in a limestone grotto. The roof is a galaxy of blue-green points. Each point hangs a curtain of silk threads beaded with droplets. The black water doubles every point.
The boat drifts slowly: near points slide past far ones, and the doubles slide with them.
Tap the water: a hand dips, rings spread, and the doubled lights shiver. Tap the roof: a drop falls from there, plinks, and rings spread.
A sound (the drip, the splash, a voice) dims the nearest points for a moment. They come back slowly, one by one.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, first person, low in the boat (eye 0.85 m over the water), looking forward and a little up | Parallax and the mirror need depth. Low eyes put the roof over the top of the frame and its double under the middle. |
| Place | One grotto: a low dome about 22 x 38 m, 4 m high, with seven flowstone curtains and a passage out at the far end | A chamber needs no streaming; the boat loops in it and sees every side. |
| Renderer | Raw WebGL2 on `shared/gl.js`. A rock pass (a signed-distance march at half size), points and threads as instanced sprites, the same again from the mirror camera, then a water composite, bloom (`shared/glow.js`) and the film curve (`shared/output.js`) | Small programs link fast on D3D11. Sprites keep thousands of points sharp at any size. |
| Points | About 11,000 glowworms on the downward faces of the rock, dense in bands and on the curtain fringes, sparse elsewhere | The photos show colonies in bands, like a Milky Way. |
| Threads | Four to ten threads per worm, 4 to 42 cm, lit by the worm above, with bead glints that change with the view | The threads read only near the boat, as in the photos. |
| Water | A mirror with Fresnel; ring ripples from each event shift the reflection | The doubles are the idea. |
| Light | Only the glow. No lamp, no fog volume | A real boat ride runs in the dark. |
| Colour | Cyan blue-green, about 487 nm, varied a little per worm | Arachnocampa light peaks near 487 nm. |

## Gestures

| Input | Does |
|---|---|
| Tap the water | A hand dips there: rings, a soft splash, the worms above dim |
| Tap the roof | A drop falls from there into the water: a plink, rings, a small dim |
| Drag | Look round; the boat keeps its drift |
| Space | A drop from a random point in view |
| V | A soft voice from the boat: worms dim in a wave from the boat out |
| Drift slider | How fast the boat drifts; 0 holds it still |

## Bar v3

Actions: Drip (Space), Voice (V). Slider: Drift. No choice. Settings: the site's Quality only.

## Frame loop

- Lively during a gesture, a drop, a ripple or a dim wave: full rate.
- Drifting: 30 fps. Asleep 60 s after input; the drift eases out over 2 s.
- Reduced motion: no drift, no thread sway, smaller rings; dims still show.

## Tasks

1. Blockout: rock and points on the stage. Screenshot at 1280 x 800.
2. Threads, the mirror, the ripples, the dim waves.
3. Sound: a cave room tone, drips, splash, voice, all in a long stone echo.
4. Bar v3, the icon round, the Lab entry, QA, the toy doc.

## Reference (photos looked at, 2026-11-23)

- Wikimedia Commons, "Glowworm Grotto, Waitomo Glowworm Cave": drapes and overhangs; worms cluster on their undersides; the boat doubles in still water.
- Wikimedia Commons, "Green Glow Caves in New Zealand": a dense band of blue points along the roof, sparse points round it.
- Wikimedia Commons, "Glowworms Inside the Ruakuri Cave": threads hang dense and straight, 10 to 30 cm, beaded.
