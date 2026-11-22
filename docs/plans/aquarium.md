# Aquarium (`aquarium`) plan

Status: built as a Lab MVP on 2026-11-22, on Bar v3; the toy doc is `docs/toys/aquarium.md` · Bean: `stimming-4xbr` · Idea 362, group F; concept 8 in `next-ten-concepts.md`

**Goal:** a planted tank that you look into. Tap the surface to drop food: the fish rise and take it. Tap the glass: they scatter, calm down and come back.
MVP at high fidelity: one hero moment, finished. No modes.

## Defaults (open questions, chosen here)

| Question | Choice | Why |
|---|---|---|
| 3D or flat | 3D. A fixed front view through the glass, with a small parallax on the mouse. | Schools need depth to read as schools. Parallax makes the tank read as a box of water. |
| Fresh or salt | Fresh water, a planted tank in the nature style. | Plants carry the light; no reef props. |
| Real or made-up fish | Real: cardinal tetras (blue), ember tetras (orange), lemon tetras (yellow). | Each species schools with its own kind. The colours match Tom's pick A. |
| Presentation | The stage is the inside of the tank: no frame. The waterline sits near the top; the room above is dark. | The Look rule: light carries the scene, no props. |

## Apart from its neighbours

- Terrarium: a sealed jar of plants, no animals. Here, animals that react.
- Murmuration: a flock in open sky. Here, three small schools in a box of water, with food and fear.
- Caustic pool: light on water seen from above. Here, light seen from inside the water.

## Scene

- **Water:** a box, about 120 x 45 x 44 cm. Its width follows the stage aspect, so a phone gets a narrow, tall tank.
- **Light:** one lamp above. Caustics on sand, plants and fish backs. Soft shafts from the surface. Depth haze that takes red first.
- **Surface:** seen from below, a mirror (total internal reflection) that ripples. Food and knocks ring it.
- **Sand:** slopes up to the back. A low green carpet in front; two tall clumps of ribbon plants at the back.
- **Life:** motes in the shafts; oxygen pearls rise from the leaves now and then.

## The hero moment

1. **Feed:** a tap on the surface strip drops a pinch of flakes. They float, spread, then sink and wobble. Near fish see them first; the rest follow. A fish darts and nips; the flake goes.
2. **Knock:** a tap in the water knocks the glass there. A ring of light shows at once. Near fish do a C-start and flee; the startle runs through the school as a wave. The schools pack tight across the tank from the knuckle, then calm over about 8 s and come forward to the glass.

## Bar v3

| Part | Content |
|---|---|
| Actions | Feed (F), Knock (K) |
| Slider | Light: the lamp, from dim to bright |
| Help | Click the surface: drop food · Click the glass: knock · F feed · K knock |

## Sound (muted by default)

- Knock: a knuckle on glass. A low thump and a short glassy ring, panned to the point.
- Food: a soft patter on the surface. Nibbles: small plips when a fish takes a flake at the top.
- Bed: a quiet, filtered water hum; a pearl now and then.

## Frame loop

- Lively while food is in the water or the fish are afraid: full rate. Swimming is drifting: 30 fps.
- Asleep 60 s after the last input; hidden stops at once.
- Reduced motion: the fish hold still; feed and knock still move them, slower; no parallax.

## Tasks

- [x] Blockout screenshot at 1280 x 800
- [x] Fish, schools, feed, knock
- [x] Light, surface, post
- [x] Sound
- [x] Bar, menu tile, emblem, `toys.json`
- [x] QA Q1 to Q10; `docs/toys/aquarium.md`
