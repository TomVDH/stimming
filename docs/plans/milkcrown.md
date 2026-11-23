# Milk crown (`milkcrown`)

Status: done as an MVP, 2026-11-23; waits on Tom. Bean `stimming-imb3`. Toy doc: `docs/toys/milkcrown.md`. Idea 371, group E: "A drop falls into milk in slow motion; the crown rises, beads on every point, the jet shoots back. Scrub the moment."

## The hero moment

A white drop falls into a pool of milk in front of a studio backdrop, in slow motion.
The drop strikes, a thin crown sheet rises from a ring round the crater, and its rim breaks into evenly spaced points. Each point throws a bead.
The crown falls back, the crater fills, and a Worthington jet shoots up from the centre. Its neck thins and pinches off one droplet, which arcs up and falls back.
Rings spread out and the milk settles to a mirror.
Tap to release a drop. Drag across the stage to scrub the moment forward and back, frame by frame. Hold still to freeze a frame. Release, and the moment plays on to rest.

## Defaults (Tom's open question: 3D or flat, and the presentation)

| | Choice | Why |
|---|---|---|
| Space | 3D, a macro camera about 15 degrees over the milk, as in the classic high-speed photographs | The crown is a shape in depth. From low down the eye sees the wall, the points and the beads against the backdrop, and their reflection in the milk. |
| Renderer | Raw WebGL2 on `shared/gl.js`: one signed-distance march, bloom from `shared/glow.js`, a grade | All parts are one liquid. Smooth unions give the fillets, necks and pinch-offs that milk shows. |
| Model | A timeline in event time (ms after impact), with every shape an analytic function of that time | Scrubbing is exact in both directions: a frame is a time, not a sim state. |
| Points | Domain repetition round the axis: one finger and one bead per sector, each with its own jitter from a uniform array | 24 points cost the same as one. |
| Light | A dark studio: a big softbox from the front left, a cool strip light behind on the right, a backdrop sweep with a lit spot behind the crown | The thin wall glows where the back light passes through it; the beads carry the softbox as a glint. |
| Backdrop | Three studio colours: Blue (default), Red, Black | The milk is white; the backdrop sets the colour of the shot. |
| Slow motion | About 1/110 of real time through the crown and the jet, then a speed ramp while the droplet flies | The droplet flight takes over 100 ms of event time; the ramp keeps the whole play under 11 s. |

## Physics (event time, ms; lengths in mm)

| Part | Model |
|---|---|
| Drop | Radius 2 mm. Speed from the drop height, `sqrt(2 g h)`: 1.4 to 3.4 m/s. A small shape wobble in the fall. |
| Crown | Base radius grows with the square root of time (Yarin and Weiss). Height rises to its peak at 8 ms and falls back by 21 ms. The wall flares outward and is thin; the rim is a thicker torus. |
| Points | Count from the impact speed, about 24 at the default height (Rayleigh-Plateau spacing on the rim). Fingers grow from 2 ms; each bead pinches off at 9 to 12 ms and flies on a ballistic path, at 4.5 g for drag, so the beads rain back while the jet rises. A slow drop makes points that do not pinch off. |
| Crater and jet | The crater opens under the crown and fills from 12 ms. The jet rises from 19 ms, its neck thins and pinches off one droplet at 29 ms. The column falls back. |
| Rings | Capillary rings from the impact, gravity rings from the crown's collapse and from the droplet's return, each a packet that travels out and fades. |

## Bar v3

Choice Backdrop (Blue, Red, Black; keys 1 to 3). Slider Height (10 to 60 cm). Action Drop (Space). Keys: left and right arrows step one frame.

## Reference (photos looked at, 2026-11-23)

- Edgerton, Milk Drop Coronet, 1957 (public domain): a short, wide white wall with about 24 points, a bead just over each point, a low camera, the next drop above.
- McLassus, drop-impact back-jet, 2006 (CC BY-SA): a thick column with a rounded top, standing in concentric ripples.
- A water splash, 2012 (Flickr, CC BY): the jet's neck thins under a bulb; a droplet pinched off earlier flies above.

## Tasks

1. Blockout: pool, crown, camera, light. Screenshot.
2. Timeline: drop, crown, points and beads, crater, jet, pinch-off, rings.
3. Light and look: softbox glints, translucent wall, reflection in the milk.
4. Scrub, play, settle; frame loop and sleep.
5. Sound.
6. Bar v3; icons; Lab entry; QA Q1 to Q10.
